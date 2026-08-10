/**
 * @file index.tsx
 * @description 工坊用手机扩展入口：引导注册 demo-shop / 聊天 / 相册内页应用，
 *              并导出多模块：`PhoneExtension` + `ToastExtension` + `PhoneEditorExtension`
 *              + `ChatController` + `PhoneAlbumExtension`。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 1.3.1
 *
 * @remarks
 * - 宿主与编辑器：`@ink-zenly/phone-sdk`（main）。
 * - 内页 API / 引导：`@ink-zenly/phone-sdk/plugin`。
 * - 同包多模块：内页 APP 各自 `@extension`；编辑器外壳亦由 phone-sdk 提供。
 * - Phone SDK 应用 ID：宿主内置填程序 ID（`phone-chat` / `phone-album`）。
 */

import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerDemoShopPhoneApp } from "./demo-shop";
import { registerChatPhoneApp } from "./phone-chat/ui/register";
import { registerPhoneAlbumPhoneApp } from "./phone-album/ui/register";

bootstrapPhonePluginApps(
  definePhonePluginRegistry(
    registerDemoShopPhoneApp,
    registerChatPhoneApp,
    registerPhoneAlbumPhoneApp,
  ),
);

export {
  PhoneExtension,
  ToastExtension,
  PhoneEditorExtension,
} from "@ink-zenly/phone-sdk";
export { default } from "@ink-zenly/phone-sdk";
export { ChatController } from "./phone-chat";
export { PhoneAlbumExtension } from "./phone-album";
