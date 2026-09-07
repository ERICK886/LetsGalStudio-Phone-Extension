/**
 * @file index.ts
 * @description `@ink-zenly/phone-sdk/plugin`：内页应用客户端 API 入口（内部目录为 client/）。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.1
 *
 * @remarks
 * 对外路径仍为 `@ink-zenly/phone-sdk/plugin`。
 * 供扩展侧 `src/<app-id>/` 与第三方内页扩展使用。
 *
 * @example
 * ```ts
 * import { registerPhoneApp, bootstrapPhonePluginApps } from "@ink-zenly/phone-sdk/plugin";
 * ```
 */

export type {
  NavigateRequest,
  OpenPhoneAppOptions,
  OpenPhoneAppResult,
  OpenPhoneAppWaitUntil,
  PhoneAppBadge,
  PhoneAppRegistration,
  PhoneAppRenderProps,
  PhoneAppStyleEditorMeta,
  PhoneEditorContentItemSchema,
  PhoneEditorCustomPanes,
  PhoneEditorEnumOption,
  PhoneEditorFieldType,
  PhoneEditorPageSchema,
  PhoneEditorSectionSchema,
  PhoneNavigationController,
  PhoneSafeAreaInsets,
  PhoneSdkGlobalSlot,
  PhoneSdkHost,
  ResolvePhoneEditorCustomPanes,
} from "./runtime/types";

export type { PhoneSdkRenderPropsAccessReport } from "./debug/debug";
export type { StudioProgramRef } from "./runtime/app-id";
export type { PhoneSdkDiagSnapshot } from "./debug/diag";
export type { PhonePluginAppRegistrar } from "./bootstrap/registry";

export { PHONE_SDK_GLOBAL_KEY, getPhoneSdkAppsRegistry, getPhoneSdkSlot } from "./runtime/slot";
export {
  formatStudioProgramRef,
  isPhoneAppId,
  isStudioProgramRefPath,
  parseStudioProgramRef,
  toPhoneAppId,
  toStudioProgramRefPath,
} from "./runtime/app-id";
export {
  getRegisteredPhoneApp,
  listRegisteredPhoneApps,
  notifyPhoneAppRegistryChanged,
  registerPhoneApp,
  subscribePhoneAppRegistry,
  unregisterPhoneApp,
} from "./runtime/register";
export { getPhoneSdkHost, installPhoneSdkHost } from "./runtime/host";
export { openPhoneApp } from "./runtime/open-phone-app";
export { closePhoneApp } from "./runtime/close-phone-app";
export {
  acquirePhoneCloseLock,
  isPhoneCloseLocked,
  subscribePhoneCloseLock,
} from "./runtime/phone-close-lock";
export {
  clearPhoneAppBadge,
  formatPhoneAppBadgeLabel,
  getPhoneAppBadge,
  getPhoneAppBadges,
  setPhoneAppBadge,
  subscribePhoneAppBadges,
} from "./runtime/phone-app-badge";
export {
  clearPhoneNavigatePending,
  emitPhoneClosed,
  getLatestPhoneNavigate,
  publishPhoneNavigate,
  subscribePhoneNavigate,
  waitForPhoneClosed,
} from "./runtime/phone-nav-bus";
export {
  EMPTY_PHONE_SAFE_AREA,
  getPhoneSafeAreaInsets,
  normalizePhoneSafeAreaInsets,
  publishPhoneSafeAreaInsets,
} from "./runtime/safe-area";
export {
  PHONE_SDK_DEBUG_FLAG_KEY,
  PHONE_SDK_DEBUG_PREFIX,
  createDebugPhoneAppRenderProps,
  isPhoneSdkDebugEnabled,
  phoneSdkDebug,
  phoneSdkDebugWarn,
} from "./debug/debug";
export {
  PHONE_SDK_DIAG_FLAG_KEY,
  PHONE_SDK_DIAG_PREFIX,
  capturePhoneSdkDiagSnapshot,
  diagnosePhoneAppLookup,
  isPhoneSdkDiagEnabled,
  phoneSdkDiag,
  phoneSdkDiagWarn,
} from "./debug/diag";
export {
  addPhonePluginApp,
  clearPhonePluginApps,
  definePhonePluginRegistry,
  registerAllPhonePluginApps,
} from "./bootstrap/registry";
export { bootstrapPhonePluginApps } from "./bootstrap/bootstrap";
