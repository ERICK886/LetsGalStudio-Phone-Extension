/** 编辑器与可复用编辑组件。业务软件按需引入，不从根入口拉入宿主。 */
export { PhoneEditorExtension } from "./host/editor/phone-editor-extension";
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
export { CharacterAssetSelect } from "./host/editor/shared/character-select";
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
  PhoneCallPreview,
  type PhoneCallPreviewProps,
} from "./host/editor/phone/phone-call-preview";
export {
  PhonePreviewStatusBar,
  PhonePreviewStatusIcons,
  type PhonePreviewStatusBarProps,
  type PhonePreviewStylePreset,
} from "./host/editor/phone/phone-preview-status-bar";
export {
  readModuleSetting,
  subscribeModuleSetting,
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
