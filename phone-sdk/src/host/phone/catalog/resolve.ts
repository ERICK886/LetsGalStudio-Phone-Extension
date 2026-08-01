/**
 * @file resolve.ts
 * @description 目录合并、桌面应用解析与可用性覆盖。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */

import type {
  PhoneAppAvailabilityOverride,
  PhoneCatalog,
  PlayerPhonePreferences,
  ResolvedPhoneApp,
} from "./types";
import { isRecord, isSafeId } from "./parse";

export function normalizePhoneAppAvailability(
  value: readonly PhoneAppAvailabilityOverride[] | unknown,
): PhoneAppAvailabilityOverride[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const normalized: PhoneAppAvailabilityOverride[] = [];
  for (const raw of value.slice(0, 40)) {
    if (!isRecord(raw) || !isSafeId(raw.appId) || seen.has(raw.appId)) continue;
    const installed =
      typeof raw.installed === "boolean" ? raw.installed : undefined;
    const enabled = typeof raw.enabled === "boolean" ? raw.enabled : undefined;
    if (installed === undefined && enabled === undefined) continue;
    seen.add(raw.appId);
    normalized.push({
      appId: raw.appId,
      ...(installed === undefined ? {} : { installed }),
      ...(enabled === undefined ? {} : { enabled }),
    });
  }
  return normalized;
}

export function mergePhoneCatalog(
  catalog: PhoneCatalog,
  preferences: PlayerPhonePreferences,
): PhoneCatalog {
  const actions = new Map(catalog.actions.map((action) => [action.id, action]));
  for (const override of preferences.actionOverrides)
    actions.set(override.id, override);
  return { ...catalog, actions: [...actions.values()] };
}

/**
 * 将目录、玩家偏好与剧情 APP 状态解析为桌面实际展示的应用。
 * 作者 `preinstalled` / `enabled` 是新游戏默认值；剧情覆盖分别控制是否已安装和是否可用。
 * 无效、未知或已删除 APP 的覆盖会被安全忽略，`locked` 只决定玩家端是否可编辑。
 */
export function resolvePhoneApps(
  catalog: PhoneCatalog,
  preferences: PlayerPhonePreferences,
  availabilityOverrides: readonly PhoneAppAvailabilityOverride[] = [],
): ResolvedPhoneApp[] {
  const actions = new Map(catalog.actions.map((action) => [action.id, action]));
  const overrides = new Map(
    preferences.appOverrides.map((item) => [item.appId, item]),
  );
  const bindings = new Map(
    preferences.actionBindings.map((item) => [item.appId, item.actionId]),
  );
  const availability = new Map(
    normalizePhoneAppAvailability(availabilityOverrides).map((item) => [
      item.appId,
      item,
    ]),
  );

  const resolved = catalog.apps.flatMap((app) => {
    const state = availability.get(app.id);
    const installed = state?.installed ?? app.preinstalled !== false;
    const enabled = state?.enabled ?? app.enabled;
    // 删除才从桌面移除；禁用的 APP 仍交给 UI 以暗化、不可启动的形式展示。
    if (!installed) return [];

    const override = overrides.get(app.id);
    const requestedActionId = bindings.get(app.id);
    const actionId =
      requestedActionId && actions.has(requestedActionId)
        ? requestedActionId
        : app.defaultActionId;
    const action = actions.get(actionId);
    if (!action) return [];
    return [
      {
        ...app,
        enabled,
        displayName: override?.name ?? app.name,
        iconSource: override?.imageDataUrl ?? app.icon,
        actionId,
        action,
      },
    ];
  });

  return resolved;
}
