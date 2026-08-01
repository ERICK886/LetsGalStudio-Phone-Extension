/**
 * @file preferences.ts
 * @description 玩家偏好净化与背景 CSS 校验。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */

import type { PhoneActionDefinition, PlayerPhonePreferences } from "./types";
import { emptyPreferences } from "./defaults";
import { isRecord, isSafeId, nonEmptyString, parseActionDefinition } from "./parse";

function validDataImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 3 * 1024 * 1024 &&
    /^data:image\/(?:png|jpeg|webp);base64,/i.test(value)
  );
}

function validColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

/**
 * 验证作者或玩家提供的单个 CSS background 值。
 * 会 trim 并限制为 2048 字符，拒绝 `url()`、`@` 规则、分号和花括号，避免通过背景配置加载外部资源或注入额外规则。
 * @returns 安全的原字符串；非法或空值返回 `undefined`，调用方应回退作者默认背景。
 */
export function sanitizeBackgroundCss(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const css = value.trim();
  if (!css || css.length > 2048 || /[;{}@]|url\s*\(/i.test(css))
    return undefined;
  return css;
}

/**
 * 将 shared 存档中的不可信玩家偏好净化为完整 v1 对象。
 * 只读取列表第一项；应用覆盖和绑定最多 40 条，动作覆盖最多 100 条且按 ID 去重；图片仅接受不超过 3 MiB 的 PNG/JPEG/WebP Data URL，
 * 颜色仅接受 `#RRGGBB`。无效字段静默丢弃，版本不符时返回新的空偏好，不会修改原始存档数组。
 */
export function normalizePreferences(
  value: readonly PlayerPhonePreferences[] | null | undefined,
): PlayerPhonePreferences {
  const raw = Array.isArray(value) ? value[0] : undefined;
  if (!isRecord(raw) || raw.version !== 1) return emptyPreferences();

  const appOverrides = Array.isArray(raw.appOverrides)
    ? raw.appOverrides.slice(0, 40).flatMap((item) => {
        if (!isRecord(item) || !isSafeId(item.appId)) return [];
        const name = nonEmptyString(item.name, 24)
          ? item.name.trim()
          : undefined;
        const imageDataUrl = validDataImage(item.imageDataUrl)
          ? item.imageDataUrl
          : undefined;
        return name || imageDataUrl
          ? [
              {
                appId: item.appId,
                ...(name ? { name } : {}),
                ...(imageDataUrl ? { imageDataUrl } : {}),
              },
            ]
          : [];
      })
    : [];

  const actionBindings = Array.isArray(raw.actionBindings)
    ? raw.actionBindings
        .slice(0, 40)
        .flatMap((item) =>
          isRecord(item) && isSafeId(item.appId) && isSafeId(item.actionId)
            ? [{ appId: item.appId, actionId: item.actionId }]
            : [],
        )
    : [];

  const overrideIds = new Set<string>();
  const actionOverrides = Array.isArray(raw.actionOverrides)
    ? raw.actionOverrides.slice(0, 100).flatMap((item) => {
        const action = parseActionDefinition(item);
        if (!action || overrideIds.has(action.id)) return [];
        overrideIds.add(action.id);
        return [action];
      })
    : [];

  return {
    version: 1,
    ...(validDataImage(raw.wallpaperDataUrl)
      ? { wallpaperDataUrl: raw.wallpaperDataUrl }
      : {}),
    ...(sanitizeBackgroundCss(raw.backgroundCss)
      ? { backgroundCss: sanitizeBackgroundCss(raw.backgroundCss) }
      : {}),
    ...(validColor(raw.accentColor) ? { accentColor: raw.accentColor } : {}),
    ...(validColor(raw.shellColor) ? { shellColor: raw.shellColor } : {}),
    // 玩家拖拽已取消；升级后统一清空旧顺序，桌面仅使用作者默认排序。
    appOrder: [],
    appOverrides,
    actionBindings,
    actionOverrides,
  };
}
