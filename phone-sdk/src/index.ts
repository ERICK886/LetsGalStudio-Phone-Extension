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
export {
  PHONE_HOST_EDITOR_SCHEMA,
  PHONE_HOST_CONTENT_ITEMS,
  contentItemSettingKey,
  defaultEditorPageId,
  getSectionContentItem,
  resolveEditorPage,
  resolvePageContentItems,
  sortEditorPages,
} from "./host/editor/schema/phone-host-editor-schema";
export {
  CHAT_APP_EDITOR_SCHEMA,
  CHAT_APP_CONTENT_ITEMS,
  CHAT_APP_EDITOR_PAGES,
  CHAT_SETTINGS_MODULE_ID,
  PHONE_SETTINGS_MODULE_ID,
} from "./host/editor/schema/chat-app-editor-schema";
export {
  resolveEditorSectionSchema,
  placeholderSectionSchema,
} from "./host/editor/schema/resolve-editor-section-schema";
export { buildSectionSchemaFromStyleEditor } from "./host/editor/schema/build-section-schema-from-style-editor";
export { AssetUriField, AssetUriThumb } from "./host/editor/shared/asset-uri-field";
export {
  EnumSelect,
  type EnumSelectProps,
} from "./host/editor/shared/enum-select";
export {
  type EnumSelectOption,
  filterEnumOptions,
  mergeOrphanOption,
  resolveEnumLabel,
} from "./host/editor/shared/enum-select-utils";
export {
  useTheme,
  FONT_SIZE_DEFAULT,
  ThemeProvider,
} from "./host/editor/theme/theme-provider";
export type { ThemeContextValue } from "./host/editor/theme/theme-provider";
export { PhoneContentList } from "./host/editor/phone/phone-content-list";
export { PhonePropertyPanel } from "./host/editor/phone/phone-property-panel";
export {
  readModuleSetting,
  writeModuleSetting,
} from "./host/editor/schema/section-settings-bridge";
export { readPhoneAppearanceValues } from "./host/editor/phone/phone-settings-bridge";
export { firstGlyph, resolveAssetUrl } from "./host/phone/ui/asset-utils";
export type {
  PhoneEditorContentItemSchema,
  PhoneEditorCustomPanes,
  PhoneEditorEnumOption,
  PhoneEditorFieldType,
  PhoneEditorPageSchema,
  PhoneEditorSectionSchema,
  ResolvePhoneEditorCustomPanes,
} from "./client/runtime/types";
export default PhoneExtension;
