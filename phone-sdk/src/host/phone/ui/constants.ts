/**
 * @file constants.ts
 * @description 手机 UI 常量、标签与默认 target 工厂。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */

import {
  INTERNAL_SYSTEM_SLOT,
  INTERNAL_SYSTEM_SLOT_IDS,
} from "@avg-studio/sdk";
import type { LocalCommandId, PhoneTarget } from "../catalog";

export const GRID_COLUMNS = 4;
export const MAX_WALLPAPER_BYTES = 2 * 1024 * 1024;
export const MAX_ICON_BYTES = 512 * 1024;
export const PHONE_POPUP_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "center",
] as const;
export const PHONE_CLOSE_ANIMATION_MS = 220;
// 保留旧 shared 数据的兼容解析路径；普通桌面不再绑定这些拖拽处理器。
export const APP_REORDER_LONG_PRESS_MS = 450;
export const APP_REORDER_MOVEMENT_PX = 8;
export const PROCESSED_STORY_POINTER_EVENTS = new WeakSet<Event>();
export type LocalPhonePopupPosition = (typeof PHONE_POPUP_POSITIONS)[number];

export function normalizePhonePopupPosition(value: unknown): LocalPhonePopupPosition {
  return (PHONE_POPUP_POSITIONS as readonly unknown[]).includes(value)
    ? value as LocalPhonePopupPosition
    : "bottom-right";
}

export const TARGET_TYPE_LABELS: Record<PhoneTarget["kind"], string> = {
  "program-ui": "程序 UI（本扩展/跨扩展）",
  "visual-ui": "可视化 UI（项目/扩展）",
  "system-slot": "内置系统界面",
  "extension-method": "扩展方法（Fragment 适配）",
  fragment: "剧情 Fragment",
  "local-command": "手机内部方法",
  "in-phone-app": "手机内部应用（Phone SDK）",
};

export const PHONE_SYSTEM_SLOT_IDS = INTERNAL_SYSTEM_SLOT_IDS.filter(
  (slot) => slot !== INTERNAL_SYSTEM_SLOT.Input && slot !== INTERNAL_SYSTEM_SLOT.Choice,
);

export const LOCAL_COMMAND_LABELS: Record<LocalCommandId, string> = {
  "quick-save": "快速存档",
  "quick-load": "快速读档",
  "toggle-fullscreen": "切换全屏",
};

export function createDefaultTarget(kind: PhoneTarget["kind"]): PhoneTarget {
  switch (kind) {
    case "program-ui": return { kind, ref: "" };
    case "visual-ui": return { kind, name: "", modal: true };
    case "system-slot": return { kind, slot: INTERNAL_SYSTEM_SLOT.Settings };
    case "extension-method": return { kind, methodRef: "", fragmentId: "" };
    case "fragment": return { kind, fragmentId: "" };
    case "local-command": return { kind, commandId: "quick-save" };
    case "in-phone-app": return { kind, phoneAppId: "" };
  }
}

export function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}
