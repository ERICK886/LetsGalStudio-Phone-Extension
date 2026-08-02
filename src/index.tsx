/**
 * @file index.tsx
 * @description 自定义手机扩展入口：导出宿主，并注册 `src/<app-id>/` 内页应用。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 *
 * @remarks
 * - 宿主：`@ink-zenly/phone-sdk`（main），不编写内页。
 * - 内页 API / 引导：`@ink-zenly/phone-sdk/plugin`。
 * - 内页应用目录：`src/<app-id>/`（仅保留应用本身）。
 */

import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerDemoShopPhoneApp } from "./demo-shop";

bootstrapPhonePluginApps(definePhonePluginRegistry(registerDemoShopPhoneApp));

export { PhoneExtension, ToastExtension } from "@ink-zenly/phone-sdk";
export { default } from "@ink-zenly/phone-sdk";
