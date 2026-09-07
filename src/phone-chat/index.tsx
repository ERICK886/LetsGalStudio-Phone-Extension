/**
 * @file index.tsx
 * @description 手机聊天扩展模块：独立 `@extension` 程序，自有设置 / 存档 / Fragment 方法。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.4.0
 *
 * @remarks
 * - 扩展包 id：`ink.zenly.ext-7a9373`（与宿主同包多模块）
 * - 程序 ID：`phone-chat`（`@extension` / `registerPhoneApp`）
 * - Phone SDK 应用 ID：填 `phone-chat`
 * - 内页 UI 由宿主入口 `bootstrapPhonePluginApps` 注册；本类 `onRegister` 只缓存设置，不重复 register。
 * - Studio 方法 target：`ink.zenly.ext-7a9373/phone-chat/<method-id>`
 */

import {
  defineSave,
  Extension,
  extension,
  settings,
  type ExtensionContext,
} from "@avg-studio/sdk";

import { PROGRAM_ID } from "./constants";
import { buildChatSettingsFields } from "./settings-fields";
import { chatSaveSchemaFields } from "./save-fields";
import {
  chatSendFriendMessagesMethod,
  chatAwaitPlayerReplyMethod,
  chatSendGroupMessagesMethod,
  chatAwaitGroupReplyMethod,
  chatJoinGroupMethod,
  chatLeaveGroupMethod,
  chatAddFriendMethod,
  chatRemoveFriendMethod,
} from "./methods";
import {
  CHAT_SETTINGS_KEYS,
  cacheAuthorSettings,
  readAuthorSettings,
} from "./runtime/settings";
import { bindChatSave } from "./runtime/store";
import { emitChatBus } from "./runtime/bus";
import { syncChatDesktopBadge } from "./runtime/desktop-badge";
import { resolveReplyWaitsForFriend } from "./runtime/reply-wait";

/** Studio 聊天方法内联卡片（紫色主题）；副作用安装。 */
import "./studio/chat-inline-cards";

const settingsRegistrationCleanups = new WeakMap<object, () => void>();

/**
 * 手机聊天扩展控制器。
 *
 * @remarks
 * 内页由 `registerPhoneApp`（bootstrap）注入宿主手机屏幕；本类负责本模块设置、存档与方法。
 */
@extension({
  id: PROGRAM_ID,
  label: "手机聊天",
  exposeUI: false,
})
export class ChatController extends Extension {
  /**
   * 作者设置：默认好友、默认群聊、详情属性槽、文案（本模块独立命名空间）。
   */
  static settings = settings((s) => buildChatSettingsFields(s));

  /**
   * 存档字段（跟游戏进度，slot；本模块独立命名空间）。
   */
  static saveSchema = defineSave(chatSaveSchemaFields);

  static sendFriendMessages = chatSendFriendMessagesMethod;
  static awaitPlayerReply = chatAwaitPlayerReplyMethod;
  static sendGroupMessages = chatSendGroupMessagesMethod;
  static awaitGroupReply = chatAwaitGroupReplyMethod;
  static joinGroup = chatJoinGroupMethod;
  static leaveGroup = chatLeaveGroupMethod;
  static addFriend = chatAddFriendMethod;
  static removeFriend = chatRemoveFriendMethod;

  /**
   * Studio 加载时缓存默认设置并订阅变更；不重复 `registerPhoneApp`。
   *
   * @param ctx - 本模块扩展上下文
   */
  static onRegister(ctx: ExtensionContext): void {
    settingsRegistrationCleanups.get(ctx)?.();
    cacheAuthorSettings(readAuthorSettings(ctx));
    const unsubscribers: Array<() => void> = [];
    for (const key of CHAT_SETTINGS_KEYS) {
      const unsubscribe = ctx.settings.subscribe(key, () => {
        cacheAuthorSettings(readAuthorSettings(ctx));
        emitChatBus({ type: "state-changed", reason: `settings:${key}` });
      });
      unsubscribers.push(unsubscribe);
    }

    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      for (const unsubscribe of unsubscribers) {
        try {
          unsubscribe();
        } catch (error) {
          console.warn("[phone-chat] 释放设置订阅失败", error);
        }
      }
      resolveReplyWaitsForFriend();
      if (settingsRegistrationCleanups.get(ctx) === cleanup) {
        settingsRegistrationCleanups.delete(ctx);
      }
    };
    settingsRegistrationCleanups.set(ctx, cleanup);
    ctx.flow.signal.addEventListener("abort", cleanup, { once: true });

    try {
      syncChatDesktopBadge();
    } catch (error) {
      console.warn("[phone-chat] 初始同步桌面角标失败", error);
    }
  }

  /**
   * 实例初始化时绑定本模块 save。
   */
  onInit(): void {
    bindChatSave(this.save as Parameters<typeof bindChatSave>[0]);
    syncChatDesktopBadge();
  }

}

export default ChatController;

/** 内页注册（向 Phone SDK 注入聊天内页）。 */
export { registerChatPhoneApp } from "./ui/register";

/** 常量：扩展包 id、程序 ID、完整应用引用。 */
export { EXTENSION_ID, PROGRAM_ID, PHONE_APP_REF } from "./constants";

/** 设置 / 存档字段工厂（供测试或外部组合；本类已直接使用）。 */
export { buildChatSettingsFields } from "./settings-fields";
export { chatSaveSchemaFields } from "./save-fields";

/** 方法描述（已挂到本类静态属性）。 */
export {
  chatSendFriendMessagesMethod,
  chatAwaitPlayerReplyMethod,
  chatSendGroupMessagesMethod,
  chatAwaitGroupReplyMethod,
  chatJoinGroupMethod,
  chatLeaveGroupMethod,
  chatAddFriendMethod,
  chatRemoveFriendMethod,
} from "./methods";

/** 运行时辅助。 */
export {
  CHAT_SETTINGS_KEYS,
  cacheAuthorSettings,
  getCachedAuthorSettings,
  readAuthorSettings,
} from "./runtime/settings";
export { syncChatDesktopBadge } from "./runtime/desktop-badge";
export { resolveReplyWaitsForFriend } from "./runtime/reply-wait";

/**
 * 扩展级卸载兼容入口：解除全部等待，避免热重载后剧情卡死。
 * 不得在聊天 APP 返回桌面或普通组件卸载时调用，否则会绕过「必须回复」。
 *
 * @returns void
 */
export function releaseChatWaitsOnUnload(): void {
  resolveReplyWaitsForFriend();
}
