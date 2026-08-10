/**
 * @file index.tsx
 * @description 手机聊天内页模块入口：仅导出注册函数、常量与方法描述，
 *              供宿主 `StudioPhoneExtension`（Task 4）合并挂载。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * - 本模块从独立扩展 `ink.zenly.app-015abe` 迁入宿主包 `ink.zenly.ext-7a9373`，
 *   作为 `src/phone-chat/` 模块存在；**不再**以独立 `Extension` 子类形式注册。
 * - 不导出 `ChatController` 类；方法以 `method()` 描述形式导出，由 Task 4 在
 *   `StudioPhoneExtension` 上以静态属性赋值挂载。
 * - 扩展包 id：`ink.zenly.ext-7a9373`（见宿主 `extension.json`）
 * - 程序 ID：`phone-chat`（`@extension` / `registerPhoneApp`）
 * - 宿主填写 Phone SDK 应用 ID：`phone-chat`（仅程序 ID）
 */

// 内页注册（向 Phone SDK 注入聊天内页）。
export { registerChatPhoneApp } from "./ui/register";

// 常量：扩展包 id、程序 ID、完整应用引用。
export { EXTENSION_ID, PROGRAM_ID, PHONE_APP_REF } from "./constants";

// 设置字段工厂（带 chat 前缀），供宿主合并到 `static settings`。
export { buildChatSettingsFields } from "./settings-fields";

// 存档字段定义（带 chat 前缀），供宿主合并到 `static saveSchema`。
export { chatSaveSchemaFields, CHAT_SAVE_KEY_MAP } from "./save-fields";

// 四个方法描述，供 Task 4 在 `StudioPhoneExtension` 上以静态属性赋值挂载。
export {
  chatSendFriendMessagesMethod,
  chatAwaitPlayerReplyMethod,
  chatAddFriendMethod,
  chatRemoveFriendMethod,
} from "./methods";

// 运行时辅助：onRegister 订阅键、缓存读写、桌面角标同步、卸载时释放等待。
export {
  CHAT_SETTINGS_KEYS,
  cacheAuthorSettings,
  getCachedAuthorSettings,
  readAuthorSettings,
} from "./runtime/settings";
export { syncChatDesktopBadge } from "./runtime/desktop-badge";
export { resolveReplyWaitsForFriend } from "./runtime/reply-wait";

// Studio 编辑器内联卡片（紫色主题）；副作用安装。
import "./studio/chat-inline-cards";
