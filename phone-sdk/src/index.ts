/**
 * @file index.ts
 * @description @ink-zenly/phone-sdk 公共导出入口。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.2
 */

export type {
  PhoneAppRegistration,
  PhoneAppRenderProps,
  PhoneSafeAreaInsets,
  PhoneSdkGlobalSlot,
  PhoneSdkHost,
} from "./types";

export type { PhoneSdkRenderPropsAccessReport } from "./debug";

export { PHONE_SDK_GLOBAL_KEY, getPhoneSdkSlot } from "./slot";
export {
  getRegisteredPhoneApp,
  isPhoneAppId,
  listRegisteredPhoneApps,
  registerPhoneApp,
  unregisterPhoneApp,
} from "./register";
export { getPhoneSdkHost, installPhoneSdkHost } from "./host";
export {
  EMPTY_PHONE_SAFE_AREA,
  getPhoneSafeAreaInsets,
  normalizePhoneSafeAreaInsets,
  publishPhoneSafeAreaInsets,
} from "./safe-area";
export {
  PHONE_SDK_DEBUG_FLAG_KEY,
  PHONE_SDK_DEBUG_PREFIX,
  createDebugPhoneAppRenderProps,
  isPhoneSdkDebugEnabled,
  phoneSdkDebug,
  phoneSdkDebugWarn,
} from "./debug";
