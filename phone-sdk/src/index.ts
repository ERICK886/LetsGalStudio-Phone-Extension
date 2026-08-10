/**
 * @file index.ts
 * @description `@ink-zenly/phone-sdk` main：手机宿主扩展（Phone / Toast / Editor / Studio）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.5.7
 *
 * @remarks
 * - 本包 main **只提供宿主**（`host/`）；不编写、不内置任何内页应用。
 * - 内页客户端 API：`@ink-zenly/phone-sdk/plugin`（内部目录 `client/`）。
 * - 本仓库内页应用写在宿主 `src/<app-id>/`，由扩展入口引导注册。
 * - `PhoneEditorExtension`（`phone-editor`）为作者侧编辑器外壳，非内页 APP。
 *
 * @example
 * ```ts
 * import {
 *   PhoneExtension,
 *   ToastExtension,
 *   PhoneEditorExtension,
 * } from "@ink-zenly/phone-sdk";
 * ```
 */

import "./host/studio/phone-inline-cards";

import { PhoneExtension } from "./host/phone/extension/phone-extension";
import { ToastExtension } from "./host/toast/extension/toast-extension";
import { PhoneEditorExtension } from "./host/editor/phone-editor-extension";

export { PhoneExtension, ToastExtension, PhoneEditorExtension };
export {
  buildPhoneHostSettingsFields,
  phoneHostSaveSchema,
} from "./host/phone/extension/phone-host-schema";
export default PhoneExtension;
