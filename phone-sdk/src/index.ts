/**
 * @file index.ts
 * @description `@ink-zenly/phone-sdk` main：手机宿主扩展（Phone / Toast / Studio）。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 *
 * @remarks
 * - 本包 main **只提供宿主**（`host/`）；不编写、不内置任何内页应用。
 * - 内页客户端 API：`@ink-zenly/phone-sdk/plugin`（内部目录 `client/`）。
 * - 本仓库内页应用写在 `src/<app-id>/`，由扩展入口引导注册。
 *
 * @example
 * ```ts
 * import { PhoneExtension, ToastExtension } from "@ink-zenly/phone-sdk";
 * ```
 */

import "./host/studio/phone-inline-cards";

import { PhoneExtension } from "./host/phone/extension/phone-extension";
import { ToastExtension } from "./host/toast/extension/toast-extension";

export { PhoneExtension, ToastExtension };
export default PhoneExtension;
