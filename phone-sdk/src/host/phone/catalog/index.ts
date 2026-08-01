/**
 * @file index.ts
 * @description 手机目录模块聚合导出。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */

export type {
  ActionSettingsRow,
  AppSettingsRow,
  GroupedActionSettingsRows,
  LocalCommandId,
  PhoneActionDefinition,
  PhoneAppAvailabilityOverride,
  PhoneAppDefinition,
  PhoneCatalog,
  PhoneTarget,
  PlayerPhonePreferences,
  ResolvedPhoneApp,
} from "./types";

export {
  DEFAULT_CATALOG,
  DEFAULT_CATALOG_JSON,
  LOCAL_COMMANDS,
  emptyPreferences,
} from "./defaults";

export {
  catalogFromSettingsRows,
  getPhoneActionValidationError,
  parsePhoneCatalog,
} from "./parse";

export {
  normalizePreferences,
  sanitizeBackgroundCss,
} from "./preferences";

export {
  mergePhoneCatalog,
  normalizePhoneAppAvailability,
  resolvePhoneApps,
} from "./resolve";

export { launchPhoneTarget } from "./launch";
