import { assertValidExtensionActionId } from "./internal-actions";
import type {
  ExtensionContext,
  InputAPI,
  SettingsAPI,
  UIAPI,
} from "./sdk-context";

/**
 * 工厂签名 —— 给 scopeExtensionContext 注入 SettingsAPI 实现。
 *
 * SDK 层不知道 settings 怎么读写(那是宿主的事),由 caller 提供工厂。
 * Studio 端的 createScopedSettings(extId, uiId?) 实现这个接口。
 * Player 端可以传不同实现(比如只读的)。
 */
export type ScopedSettingsFactory = (
  extensionId: string,
  uiId?: string,
) => SettingsAPI;

/**
 * 把一个"全局" ExtensionContext 包成"绑定到 (extensionId, uiId?)"的 scoped 版本。
 *
 * 做的事:
 *   - ctx.ui.show / hide / isVisible 自动把无 "/" 的路径补成 "${selfId}/path"
 *     (uiId 不影响 ui 路径,只影响 settings)
 *   - ctx.settings 调用 settingsFactory(selfId, uiId) 生成绑定到 (selfId, uiId) 的实例
 *   - 若没传 settingsFactory(罕见),settings 直接 pass-through base.settings
 *
 * 双层 scope:
 *   - 一级:extensionId(必传)
 *   - 二级:uiId(可选,UI 子模块级,settings 自动加 `<uiId>.` 前缀)
 *
 * 其他 API pass-through。
 */
export function scopeExtensionContext(
  base: ExtensionContext,
  selfId: string,
  uiId?: string,
  settingsFactory?: ScopedSettingsFactory,
): ExtensionContext {
  const absolutize = (path: string): string =>
    path.includes("/") ? path : `${selfId}/${path}`;

  const ui: UIAPI = {
    show: (path, props, options) =>
      base.ui.show(absolutize(path), props, options),
    hide: (path) => base.ui.hide(absolutize(path)),
    hideAll: () => base.ui.hideAll(),
    isVisible: (path) => base.ui.isVisible(absolutize(path)),
  };

  const settings: SettingsAPI = settingsFactory
    ? settingsFactory(selfId, uiId)
    : base.settings;

  // 2026-05 Internal Extension Points:registerAction 校验命名空间,要求
  // 扩展 action id 必须以扩展自身 id 为前缀。在 scope 包装时拦截,因为只有这里
  // 拿得到 selfId(base context 是无身份的)。
  const input: InputAPI = {
    ...base.input,
    registerAction(action) {
      assertValidExtensionActionId(action.id, selfId);
      base.input.registerAction(action);
    },
  };

  return {
    ...base,
    ui,
    settings,
    input,
  };
}
