/**
 * @file index.tsx
 * @description 工坊用手机扩展入口：引导注册 demo-shop / 聊天 / 相册内页应用，
 *              并导出 `StudioPhoneExtension`（作为 `PhoneExtension` 与默认导出）+ `ToastExtension`。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 1.3.0
 *
 * @remarks
 * - 宿主：`@ink-zenly/phone-sdk`（main），不编写内页。
 * - 内页 API / 引导：`@ink-zenly/phone-sdk/plugin`。
 * - 内页应用目录：`src/<app-id>/`（demo-shop / phone-chat / phone-album）。
 * - `StudioPhoneExtension` 合并手机壳 + 聊天 + 相册的设置 / 存档 / 方法，
 *   由本入口导出为 `PhoneExtension` 与默认导出，供工坊作为单一扩展加载。
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

export { StudioPhoneExtension as PhoneExtension } from "./studio-phone-extension";
export { default } from "./studio-phone-extension";
export { ToastExtension } from "@ink-zenly/phone-sdk";
