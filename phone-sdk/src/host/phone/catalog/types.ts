/**
 * @file types.ts
 * @description 手机目录与偏好相关公共类型。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */

import type { InternalSystemSlot } from "@avg-studio/sdk";

/**
 * 手机应用允许启动的受限目标集合。
 * 所有配置都必须先被解析为该判别联合，禁止从设置或存档中执行任意代码。
 */
export type PhoneTarget =
  | { kind: "program-ui"; ref: string; props?: Record<string, unknown> }
  | { kind: "visual-ui"; name: string; modal?: boolean }
  | { kind: "system-slot"; slot: InternalSystemSlot }
  | {
      kind: "extension-method";
      methodRef: string;
      fragmentId: string;
      chapterId?: string;
    }
  | { kind: "fragment"; fragmentId: string; chapterId?: string }
  | { kind: "local-command"; commandId: LocalCommandId }
  | { kind: "in-phone-app"; phoneAppId: string };

/** 允许由手机本地执行的固定命令。 */
export type LocalCommandId = "quick-save" | "quick-load" | "toggle-fullscreen";

/** 作者目录或玩家草稿中的动作定义。 */
export interface PhoneActionDefinition {
  id: string;
  name: string;
  description?: string;
  target: PhoneTarget;
}

/** 作者提供的桌面应用模板。 */
export interface PhoneAppDefinition {
  id: string;
  name: string;
  icon?: string;
  order: number;
  enabled: boolean;
  locked: boolean;
  preinstalled?: boolean;
  defaultActionId: string;
}

/** 作者动作与应用目录。 */
export interface PhoneCatalog {
  version: 1;
  actions: PhoneActionDefinition[];
  apps: PhoneAppDefinition[];
}

/** 玩家个性化偏好（shared 存档）。 */
export interface PlayerPhonePreferences {
  version: 1;
  wallpaperDataUrl?: string;
  backgroundCss?: string;
  accentColor?: string;
  shellColor?: string;
  appOrder: string[];
  appOverrides: Array<{
    appId: string;
    name?: string;
    imageDataUrl?: string;
  }>;
  actionBindings: Array<{ appId: string; actionId: string }>;
  actionOverrides: PhoneActionDefinition[];
}

/** 剧情层 APP 安装/可用覆盖。 */
export interface PhoneAppAvailabilityOverride {
  appId: string;
  installed?: boolean;
  enabled?: boolean;
}

/** 桌面解析后的应用。 */
export interface ResolvedPhoneApp extends PhoneAppDefinition {
  displayName: string;
  iconSource?: string;
  actionId: string;
  action: PhoneActionDefinition;
}

/** 设置面板中的动作行。 */
export interface ActionSettingsRow {
  id?: string;
  name?: string;
  description?: string;
  targetKind?: string;
  programUiRef?: string;
  visualUiName?: string;
  modal?: boolean;
  systemSlot?: string;
  extensionMethodRef?: string;
  methodFragmentId?: string;
  methodChapterId?: string;
  fragmentId?: string;
  chapterId?: string;
  commandId?: string;
  /** 对应 `registerPhoneApp({ id })` 的应用 id */
  phoneAppId?: string;
}

/** 按目标类型分组的动作设置行。 */
export interface GroupedActionSettingsRows {
  programUiActions?: unknown;
  visualUiActions?: unknown;
  systemSlotActions?: unknown;
  internalMethodActions?: unknown;
  /** 「动作 · 手机内部应用」表单行 */
  inPhoneAppActions?: unknown;
}

/** 设置面板中的应用行。 */
export interface AppSettingsRow {
  id?: string;
  name?: string;
  icon?: string;
  order?: number;
  preinstalled?: boolean;
  enabled?: boolean;
  locked?: boolean;
  defaultActionId?: string;
}
