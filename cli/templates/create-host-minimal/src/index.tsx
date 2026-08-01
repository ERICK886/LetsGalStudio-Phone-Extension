/**
 * @file index.tsx
 * @description {{title}} 宿主入口：导出手机宿主并注册内页。
 * @author {{author}}
 * @date {{date}}
 * @version 0.3.0
 *
 * @remarks
 * - 宿主：`@ink-zenly/phone-sdk`（main），不编写内页。
 * - 内页 API：`@ink-zenly/phone-sdk/plugin`。
 * - 内页目录：`src/{{appId}}/`（由 create 命令从 add 模板拷贝）。
 */

import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { {{registerFnName}} } from "./{{appId}}";

bootstrapPhonePluginApps(definePhonePluginRegistry({{registerFnName}}));

export { PhoneExtension, ToastExtension } from "@ink-zenly/phone-sdk";
export { default } from "@ink-zenly/phone-sdk";
