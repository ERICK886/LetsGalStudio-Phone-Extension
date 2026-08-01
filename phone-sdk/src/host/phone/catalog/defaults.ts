/**
 * @file defaults.ts
 * @description 默认目录、本地命令集合与空偏好。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */

import { INTERNAL_SYSTEM_SLOT } from "@avg-studio/sdk";
import type { LocalCommandId, PhoneCatalog, PlayerPhonePreferences } from "./types";

export const LOCAL_COMMANDS = new Set<LocalCommandId>([
  "quick-save",
  "quick-load",
  "toggle-fullscreen",
]);

export const DEFAULT_CATALOG: PhoneCatalog = {
  version: 1,
  actions: [
    {
      id: "save",
      name: "存档",
      target: { kind: "system-slot", slot: INTERNAL_SYSTEM_SLOT.Save },
    },
    {
      id: "load",
      name: "读档",
      target: { kind: "system-slot", slot: INTERNAL_SYSTEM_SLOT.Load },
    },
    {
      id: "settings",
      name: "设置",
      target: { kind: "system-slot", slot: INTERNAL_SYSTEM_SLOT.Settings },
    },
    {
      id: "history",
      name: "历史记录",
      target: { kind: "system-slot", slot: INTERNAL_SYSTEM_SLOT.History },
    },
    {
      id: "gallery",
      name: "鉴赏",
      target: { kind: "system-slot", slot: INTERNAL_SYSTEM_SLOT.Gallery },
    },
    {
      id: "quick-save",
      name: "快速存档",
      target: { kind: "local-command", commandId: "quick-save" },
    },
    {
      id: "quick-load",
      name: "快速读档",
      target: { kind: "local-command", commandId: "quick-load" },
    },
    {
      id: "fullscreen",
      name: "切换全屏",
      target: { kind: "local-command", commandId: "toggle-fullscreen" },
    },
  ],
  apps: [
    {
      id: "save",
      name: "存档",
      order: 0,
      enabled: true,
      locked: false,
      defaultActionId: "save",
    },
    {
      id: "load",
      name: "读档",
      order: 0,
      enabled: true,
      locked: false,
      defaultActionId: "load",
    },
    {
      id: "settings",
      name: "设置",
      order: 0,
      enabled: true,
      locked: false,
      defaultActionId: "settings",
    },
    {
      id: "history",
      name: "历史",
      order: 0,
      enabled: true,
      locked: false,
      defaultActionId: "history",
    },
    {
      id: "gallery",
      name: "鉴赏",
      order: 0,
      enabled: true,
      locked: false,
      defaultActionId: "gallery",
    },
    {
      id: "utility",
      name: "快捷工具",
      order: 0,
      enabled: true,
      locked: false,
      defaultActionId: "fullscreen",
    },
    {
      id: "snake",
      name: "贪吃蛇",
      order: 1,
      enabled: true,
      locked: false,
      defaultActionId: "snake",
    },
  ],
};

/** 默认目录的 JSON 快照，供旧 JSON 设置为空或无效时回退；不是可变运行时状态。 */
export const DEFAULT_CATALOG_JSON = JSON.stringify(DEFAULT_CATALOG, null, 2);

/**
 * 创建独立的空 v1 偏好对象，适用于恢复默认或作者禁用玩家个性化的安全基线。
 * 每次调用均返回新的数组，调用方可安全进行不可变草稿更新。
 */
export function emptyPreferences(): PlayerPhonePreferences {
  return {
    version: 1,
    appOrder: [],
    appOverrides: [],
    actionBindings: [],
    actionOverrides: [],
  };
}
