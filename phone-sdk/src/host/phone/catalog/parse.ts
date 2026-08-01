/**
 * @file parse.ts
 * @description 目录与动作解析、设置行转换。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */

import {
  INTERNAL_SYSTEM_SLOT,
  isInternalSystemSlot,
  resolveUIRef,
} from "@avg-studio/sdk";
import { isPhoneAppId, toPhoneAppId } from "@ink-zenly/phone-sdk/plugin";
import type {
  ActionSettingsRow,
  AppSettingsRow,
  GroupedActionSettingsRows,
  LocalCommandId,
  PhoneActionDefinition,
  PhoneAppDefinition,
  PhoneCatalog,
  PhoneTarget,
} from "./types";
import { DEFAULT_CATALOG, LOCAL_COMMANDS } from "./defaults";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSafeId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

function normalizeAppOrder(value: unknown): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 9999
    ? value
    : 0;
}

/** 数值排序相同时保持输入行顺序，避免旧项目在升级后出现意外的桌面重排。 */
function sortAppsByOrder(
  apps: readonly PhoneAppDefinition[],
): PhoneAppDefinition[] {
  return apps
    .map((app, index) => ({ app, index }))
    .sort(
      (left, right) =>
        left.app.order - right.app.order || left.index - right.index,
    )
    .map(({ app }) => app);
}

/** 净化 shared 存档里的剧情 APP 状态覆盖；未知 APP 会在目录解析阶段安全忽略。 */

export function nonEmptyString(value: unknown, max = 256): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
  );
}

function isProgramUiRef(value: unknown): value is string {
  if (!nonEmptyString(value) || value.startsWith("@") || value !== value.trim())
    return false;
  try {
    resolveUIRef(value, "ink.zenly.ext-7a9373");
    return true;
  } catch {
    return false;
  }
}

function isVisualUiName(value: unknown): value is string {
  if (!nonEmptyString(value) || value !== value.trim() || /\s/.test(value))
    return false;
  if (!value.startsWith("@")) return !value.includes("/");
  const parts = value.slice(1).split("/");
  return parts.length === 2 && parts.every((part) => part.length > 0);
}

function isExtensionMethodRef(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[^\s/@]+\/[a-z0-9][a-z0-9-]{0,63}$/.test(value)
  );
}

function parseTarget(value: unknown): PhoneTarget | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  switch (value.kind) {
    case "program-ui": {
      if (!isProgramUiRef(value.ref)) return null;
      if (value.props !== undefined && !isRecord(value.props)) return null;
      const props = value.props as Record<string, unknown> | undefined;
      return {
        kind: "program-ui",
        ref: value.ref,
        ...(props ? { props } : {}),
      };
    }
    case "visual-ui":
      return isVisualUiName(value.name)
        ? { kind: "visual-ui", name: value.name, modal: value.modal !== false }
        : null;
    case "system-slot":
      return typeof value.slot === "string" && isInternalSystemSlot(value.slot)
        ? { kind: "system-slot", slot: value.slot }
        : null;
    case "extension-method":
      return isExtensionMethodRef(value.methodRef) &&
        nonEmptyString(value.fragmentId) &&
        (value.chapterId === undefined || nonEmptyString(value.chapterId))
        ? {
            kind: "extension-method",
            methodRef: value.methodRef,
            fragmentId: value.fragmentId,
            ...(typeof value.chapterId === "string"
              ? { chapterId: value.chapterId }
              : {}),
          }
        : null;
    case "fragment":
      return nonEmptyString(value.fragmentId) &&
        (value.chapterId === undefined || nonEmptyString(value.chapterId))
        ? {
            kind: "fragment",
            fragmentId: value.fragmentId,
            ...(typeof value.chapterId === "string"
              ? { chapterId: value.chapterId }
              : {}),
          }
        : null;
    case "local-command":
      return typeof value.commandId === "string" &&
        LOCAL_COMMANDS.has(value.commandId as LocalCommandId)
        ? {
            kind: "local-command",
            commandId: value.commandId as LocalCommandId,
          }
        : null;
    case "in-phone-app": {
      const phoneAppId =
        typeof value.phoneAppId === "string"
          ? toPhoneAppId(value.phoneAppId)
          : null;
      return phoneAppId && isPhoneAppId(phoneAppId)
        ? { kind: "in-phone-app", phoneAppId }
        : null;
    }
    default:
      return null;
  }
}

export function parseActionDefinition(raw: unknown): PhoneActionDefinition | null {
  if (!isRecord(raw) || !isSafeId(raw.id) || !nonEmptyString(raw.name, 32))
    return null;
  const target = parseTarget(raw.target);
  if (!target) return null;
  return {
    id: raw.id,
    name: raw.name.trim(),
    ...(nonEmptyString(raw.description, 160)
      ? { description: raw.description.trim() }
      : {}),
    target,
  };
}

/**
 * 校验一条可编辑动作，并返回首个面向玩家的中文错误。
 * 不抛出异常，也不修改动作；用于保存草稿前阻止无效的 UI/Fragment/系统槽引用进入 shared 存档。
 */
export function getPhoneActionValidationError(
  action: PhoneActionDefinition,
): string | undefined {
  if (!isSafeId(action.id)) return "动作 ID 只能使用小写字母、数字和连字符";
  if (!nonEmptyString(action.name, 32))
    return "动作名称不能为空且不能超过 32 个字符";
  if (!parseTarget(action.target)) return "动作目标未填写完整或格式无效";
  return undefined;
}

function readCatalog(value: unknown): PhoneCatalog | null {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.actions) ||
    !Array.isArray(value.apps)
  ) {
    return null;
  }

  const actionIds = new Set<string>();
  const actions: PhoneActionDefinition[] = [];
  for (const raw of value.actions.slice(0, 100)) {
    const action = parseActionDefinition(raw);
    if (!action || actionIds.has(action.id)) continue;
    actionIds.add(action.id);
    actions.push(action);
  }
  if (actions.length === 0) return null;

  const appIds = new Set<string>();
  const apps: PhoneAppDefinition[] = [];
  for (const raw of value.apps.slice(0, 40)) {
    if (
      !isRecord(raw) ||
      !isSafeId(raw.id) ||
      appIds.has(raw.id) ||
      !nonEmptyString(raw.name, 24)
    )
      continue;
    const defaultActionId =
      typeof raw.defaultActionId === "string" &&
      actionIds.has(raw.defaultActionId)
        ? raw.defaultActionId
        : actions[0].id;
    appIds.add(raw.id);
    apps.push({
      id: raw.id,
      name: raw.name.trim(),
      ...(nonEmptyString(raw.icon, 512) ? { icon: raw.icon } : {}),
      order: normalizeAppOrder(raw.order),
      preinstalled: raw.preinstalled !== false,
      enabled: raw.enabled !== false,
      locked: raw.locked === true,
      defaultActionId,
    });
  }
  if (apps.length === 0) return null;
  return { version: 1, actions, apps: sortAppsByOrder(apps) };
}


/**
 * 解析旧版 JSON 形式的应用目录。
 * 非字符串、JSON 语法错误或结构校验失败都会记录诊断并回退内置目录；调用方始终得到可用的 v1 数据，不需要 try/catch。
 */
export function parsePhoneCatalog(rawJson: unknown): PhoneCatalog {
  if (typeof rawJson !== "string") return DEFAULT_CATALOG;
  try {
    const parsed = readCatalog(JSON.parse(rawJson));
    if (parsed) return parsed;
    console.warn("[phone-config] 应用目录结构无效，已使用默认目录");
  } catch (error) {
    console.warn(
      "[phone-config] 应用目录 JSON 无法解析，已使用默认目录",
      error,
    );
  }
  return DEFAULT_CATALOG;
}

function actionFromSettingsRow(raw: unknown): PhoneActionDefinition | null {
  if (!isRecord(raw) || typeof raw.targetKind !== "string") return null;

  let target: unknown;
  switch (raw.targetKind) {
    case "program-ui":
      target = { kind: "program-ui", ref: raw.programUiRef };
      break;
    case "visual-ui":
      target = {
        kind: "visual-ui",
        name: raw.visualUiName,
        modal: raw.modal !== false,
      };
      break;
    case "system-slot":
      target = { kind: "system-slot", slot: raw.systemSlot };
      break;
    case "extension-method":
      target = {
        kind: "extension-method",
        methodRef: raw.extensionMethodRef,
        fragmentId: raw.methodFragmentId,
        ...(nonEmptyString(raw.methodChapterId)
          ? { chapterId: raw.methodChapterId }
          : {}),
      };
      break;
    case "fragment":
      target = {
        kind: "fragment",
        fragmentId: raw.fragmentId,
        ...(nonEmptyString(raw.chapterId) ? { chapterId: raw.chapterId } : {}),
      };
      break;
    case "local-command":
      target = { kind: "local-command", commandId: raw.commandId };
      break;
    case "in-phone-app":
      target = { kind: "in-phone-app", phoneAppId: raw.phoneAppId };
      break;
    default:
      return null;
  }

  return parseActionDefinition({
    id: raw.id,
    name: raw.name,
    description: raw.description,
    target,
  });
}

function actionsFromSettingsRows(value: unknown): PhoneActionDefinition[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.slice(0, 100).flatMap((raw) => {
    const action = actionFromSettingsRow(raw);
    if (!action || ids.has(action.id)) return [];
    ids.add(action.id);
    return [action];
  });
}

function rowsWithTargetKind(
  value: unknown,
  targetKind: PhoneTarget["kind"],
): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => (isRecord(row) ? { ...row, targetKind } : row));
}

function actionsFromGroupedSettingsRows(
  groups: GroupedActionSettingsRows | undefined,
): PhoneActionDefinition[] {
  if (!groups) return [];
  return actionsFromSettingsRows([
    ...rowsWithTargetKind(groups.programUiActions, "program-ui"),
    ...rowsWithTargetKind(groups.visualUiActions, "visual-ui"),
    ...rowsWithTargetKind(groups.systemSlotActions, "system-slot"),
    ...rowsWithTargetKind(groups.internalMethodActions, "local-command"),
    ...rowsWithTargetKind(groups.inPhoneAppActions, "in-phone-app"),
  ]);
}

function appsFromSettingsRows(
  value: unknown,
  actions: readonly PhoneActionDefinition[],
): PhoneAppDefinition[] {
  if (!Array.isArray(value) || actions.length === 0) return [];
  const actionIds = new Set(actions.map((action) => action.id));
  const appIds = new Set<string>();
  const apps: PhoneAppDefinition[] = [];

  for (const raw of value.slice(0, 40)) {
    if (
      !isRecord(raw) ||
      !isSafeId(raw.id) ||
      appIds.has(raw.id) ||
      !nonEmptyString(raw.name, 24)
    ) {
      continue;
    }
    appIds.add(raw.id);
    apps.push({
      id: raw.id,
      name: raw.name.trim(),
      ...(nonEmptyString(raw.icon, 512) ? { icon: raw.icon } : {}),
      order: normalizeAppOrder(raw.order),
      preinstalled: raw.preinstalled !== false,
      enabled: raw.enabled !== false,
      locked: raw.locked === true,
      defaultActionId:
        typeof raw.defaultActionId === "string" &&
        actionIds.has(raw.defaultActionId)
          ? raw.defaultActionId
          : actions[0].id,
    });
  }

  return sortAppsByOrder(apps);
}

/**
 * 将 Studio 的分组 array 表单转换为统一运行时目录。
 *
 * @param legacyActionRows 旧版 `catalogActions` 宽表，仅在新分组表单没有有效动作时读取。
 * @param appRows 当前 Studio 的应用目录表单。
 * @param legacyJson 更早版本保存的 JSON 目录；无效时回退内置目录。
 * @param groupedRows 当前四个按目标类型拆分的动作表单。
 * @returns v1 目录。优先级为分组表单 > 旧宽表 > 旧 JSON/内置目录；配置动作按 ID 覆盖回退动作。
 * @remarks 目录始终至少返回一个可用应用，避免手机 UI 因项目配置不完整而白屏。
 */
export function catalogFromSettingsRows(
  legacyActionRows: unknown,
  appRows: unknown,
  legacyJson?: unknown,
  groupedRows?: GroupedActionSettingsRows,
): PhoneCatalog {
  const fallback = parsePhoneCatalog(legacyJson);
  const groupedActions = actionsFromGroupedSettingsRows(groupedRows);
  const legacyActions = actionsFromSettingsRows(legacyActionRows);
  const configuredActions =
    groupedActions.length > 0 ? groupedActions : legacyActions;
  const actions =
    configuredActions.length > 0
      ? [
          ...new Map([
            ...configuredActions.map((action) => [action.id, action] as const),
            ...fallback.actions.map((action) => [action.id, action] as const),
          ]).values(),
        ].slice(0, 100)
      : fallback.actions;
  const configuredApps = appsFromSettingsRows(appRows, actions);
  const apps =
    configuredApps.length > 0
      ? configuredApps
      : appsFromSettingsRows(fallback.apps, actions);

  return {
    version: 1,
    actions: [...actions],
    apps:
      apps.length > 0
        ? apps
        : [
            {
              id: "phone",
              name: "手机",
              order: 0,
              enabled: true,
              locked: false,
              defaultActionId: actions[0].id,
            },
          ],
  };
}
