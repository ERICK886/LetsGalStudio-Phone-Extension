/**
 * @file desktop-actions-bridge.ts
 * @description 编辑器「桌面应用」页内：读写五组动作 settings。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @example
 * ```ts
 * const actions = readEditableCatalogActions(ctx);
 * writeEditableCatalogActions(ctx, actions);
 * ```
 */

import {
  INTERNAL_SYSTEM_SLOT,
  type ExtensionContext,
} from "@avg-studio/sdk";

import { DEFAULT_CATALOG } from "../../phone/catalog";
import type {
  LocalCommandId,
  PhoneActionDefinition,
} from "../../phone/catalog";
import {
  LOCAL_COMMAND_LABELS,
  PHONE_SYSTEM_SLOT_IDS,
} from "../../phone/ui/constants";
import {
  readPhoneSetting,
  writePhoneSetting,
} from "./phone-settings-bridge";

/**
 * 可在编辑器中配置的动作目标种类（对应五组 settings 键）。
 */
export type EditableActionKind =
  | "program-ui"
  | "visual-ui"
  | "system-slot"
  | "local-command"
  | "in-phone-app";

/**
 * 可编辑动作行（统一模型，按 kind 写回对应 settings 数组）。
 */
export interface EditableCatalogAction {
  /** 动作目标种类 */
  kind: EditableActionKind;
  /** 动作 ID（应用 defaultActionId 引用） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 说明（可空） */
  description: string;
  /** program-ui：UI 引用 */
  programUiRef: string;
  /** visual-ui：界面名称 */
  visualUiName: string;
  /** visual-ui：是否模态 */
  modal: boolean;
  /** system-slot：系统槽位 id */
  systemSlot: string;
  /** local-command：内部命令 id */
  commandId: LocalCommandId;
  /** in-phone-app：Phone SDK 应用 ID */
  phoneAppId: string;
}

/** kind → settings 键 */
export const ACTION_KIND_SETTING_KEY: Record<EditableActionKind, string> = {
  "program-ui": "programUiActions",
  "visual-ui": "visualUiActions",
  "system-slot": "systemSlotActions",
  "local-command": "internalMethodActions",
  "in-phone-app": "inPhoneAppActions",
};

/** 列表 / 添加用中文标签 */
export const ACTION_KIND_LABELS: Record<EditableActionKind, string> = {
  "program-ui": "程序 UI",
  "visual-ui": "可视化 UI",
  "system-slot": "系统界面",
  "local-command": "内部方法",
  "in-phone-app": "手机内部应用",
};

/** 全部可编辑 kind（稳定顺序） */
export const EDITABLE_ACTION_KINDS: readonly EditableActionKind[] = [
  "program-ui",
  "visual-ui",
  "system-slot",
  "local-command",
  "in-phone-app",
] as const;

/** 系统槽位下拉选项 */
export const EDITOR_SYSTEM_SLOT_OPTIONS = PHONE_SYSTEM_SLOT_IDS.map((slot) => ({
  value: slot,
  label:
    slot === INTERNAL_SYSTEM_SLOT.Title
      ? "标题画面"
      : slot === INTERNAL_SYSTEM_SLOT.Toolbar
        ? "对话工具栏"
        : slot === INTERNAL_SYSTEM_SLOT.Save
          ? "存档界面"
          : slot === INTERNAL_SYSTEM_SLOT.Load
            ? "读档界面"
            : slot === INTERNAL_SYSTEM_SLOT.Settings
              ? "设置界面"
              : slot === INTERNAL_SYSTEM_SLOT.History
                ? "历史记录"
                : slot === INTERNAL_SYSTEM_SLOT.Gallery
                  ? "鉴赏界面"
                  : slot,
}));

/** 内部命令下拉选项 */
export const EDITOR_LOCAL_COMMAND_OPTIONS = (
  Object.keys(LOCAL_COMMAND_LABELS) as LocalCommandId[]
).map((id) => ({
  value: id,
  label: LOCAL_COMMAND_LABELS[id],
}));

/**
 * 判断未知值是否为合法 LocalCommandId。
 *
 * @param value - 原始值
 * @returns 是否合法
 */
function isLocalCommandId(value: unknown): value is LocalCommandId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(LOCAL_COMMAND_LABELS, value)
  );
}

/**
 * 将运行时 PhoneActionDefinition 转为可编辑行；不支持的 target 返回 null。
 *
 * @param action - 目录动作
 * @returns 可编辑行或 null
 */
export function editableFromPhoneAction(
  action: PhoneActionDefinition,
): EditableCatalogAction | null {
  const base = {
    id: action.id,
    name: action.name,
    description: action.description ?? "",
    programUiRef: "",
    visualUiName: "",
    modal: true,
    systemSlot: INTERNAL_SYSTEM_SLOT.Settings,
    commandId: "quick-save" as LocalCommandId,
    phoneAppId: "",
  };

  const target = action.target;

  switch (target.kind) {
    case "program-ui":
      return { ...base, kind: "program-ui", programUiRef: target.ref ?? "" };
    case "visual-ui":
      return {
        ...base,
        kind: "visual-ui",
        visualUiName: target.name ?? "",
        modal: target.modal !== false,
      };
    case "system-slot":
      return { ...base, kind: "system-slot", systemSlot: target.slot };
    case "local-command":
      return { ...base, kind: "local-command", commandId: target.commandId };
    case "in-phone-app":
      return {
        ...base,
        kind: "in-phone-app",
        phoneAppId: target.phoneAppId ?? "",
      };
    default:
      return null;
  }
}

/**
 * 从内置 DEFAULT_CATALOG.actions 生成可编辑草稿。
 *
 * @returns 默认动作行
 */
export function defaultEditableCatalogActions(): EditableCatalogAction[] {
  const rows: EditableCatalogAction[] = [];
  const seen = new Set<string>();

  for (const action of DEFAULT_CATALOG.actions) {
    const row = editableFromPhoneAction(action);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }

  return rows;
}

/**
 * 规范化单条 settings 行。
 *
 * @param kind - 目标种类
 * @param raw - 原始对象
 * @returns 规范化行或 null
 */
function normalizeRow(
  kind: EditableActionKind,
  raw: unknown,
): EditableCatalogAction | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!id || !name) return null;

  const description =
    typeof row.description === "string" ? row.description.slice(0, 200) : "";

  const base: EditableCatalogAction = {
    kind,
    id: id.slice(0, 64),
    name: name.slice(0, 48),
    description,
    programUiRef: "",
    visualUiName: "",
    modal: true,
    systemSlot: INTERNAL_SYSTEM_SLOT.Settings,
    commandId: "quick-save",
    phoneAppId: "",
  };

  switch (kind) {
    case "program-ui":
      base.programUiRef =
        typeof row.programUiRef === "string"
          ? row.programUiRef.trim().slice(0, 128)
          : "";
      break;
    case "visual-ui":
      base.visualUiName =
        typeof row.visualUiName === "string"
          ? row.visualUiName.trim().slice(0, 128)
          : "";
      base.modal = row.modal !== false;
      break;
    case "system-slot": {
      const slot =
        typeof row.systemSlot === "string" ? row.systemSlot.trim() : "";
      base.systemSlot = PHONE_SYSTEM_SLOT_IDS.includes(
        slot as (typeof PHONE_SYSTEM_SLOT_IDS)[number],
      )
        ? slot
        : INTERNAL_SYSTEM_SLOT.Settings;
      break;
    }
    case "local-command":
      base.commandId = isLocalCommandId(row.commandId)
        ? row.commandId
        : "quick-save";
      break;
    case "in-phone-app":
      base.phoneAppId =
        typeof row.phoneAppId === "string"
          ? row.phoneAppId.trim().slice(0, 128)
          : "";
      break;
  }

  return base;
}

/**
 * 读取某一组 settings 数组并规范化。
 *
 * @param ctx - 扩展上下文
 * @param kind - 动作种类
 * @param seen - 已占用 id（跨组去重）
 * @returns 该组动作行
 */
function readKindRows(
  ctx: ExtensionContext,
  kind: EditableActionKind,
  seen: Set<string>,
): EditableCatalogAction[] {
  const key = ACTION_KIND_SETTING_KEY[kind];
  const raw = readPhoneSetting(ctx, key);
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const rows: EditableCatalogAction[] = [];
  for (const item of raw.slice(0, 40)) {
    const row = normalizeRow(kind, item);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}

/**
 * 读取可编辑动作列表。
 * 五组全部为空时回退内置 DEFAULT_CATALOG.actions（尚未落盘的草稿）。
 *
 * @param ctx - 扩展上下文
 * @returns 动作行
 */
export function readEditableCatalogActions(
  ctx: ExtensionContext,
): EditableCatalogAction[] {
  const seen = new Set<string>();
  const merged: EditableCatalogAction[] = [];

  for (const kind of EDITABLE_ACTION_KINDS) {
    merged.push(...readKindRows(ctx, kind, seen));
  }

  if (merged.length > 0) return merged;
  return defaultEditableCatalogActions();
}

/**
 * 将可编辑行序列化为某一 settings 数组元素。
 *
 * @param action - 可编辑行
 * @returns 可写入对象
 */
function toSettingsRow(action: EditableCatalogAction): Record<string, unknown> {
  const base = {
    id: action.id,
    name: action.name,
    description: action.description,
  };

  switch (action.kind) {
    case "program-ui":
      return { ...base, programUiRef: action.programUiRef };
    case "visual-ui":
      return {
        ...base,
        visualUiName: action.visualUiName,
        modal: action.modal,
      };
    case "system-slot":
      return { ...base, systemSlot: action.systemSlot };
    case "local-command":
      return { ...base, commandId: action.commandId };
    case "in-phone-app":
      return { ...base, phoneAppId: action.phoneAppId };
  }
}

/**
 * 写入五组动作 settings（覆盖；按 kind 拆分）。
 *
 * @param ctx - 扩展上下文
 * @param actions - 全部动作行
 * @returns 是否全部写入成功
 */
export function writeEditableCatalogActions(
  ctx: ExtensionContext,
  actions: readonly EditableCatalogAction[],
): boolean {
  const buckets: Record<EditableActionKind, EditableCatalogAction[]> = {
    "program-ui": [],
    "visual-ui": [],
    "system-slot": [],
    "local-command": [],
    "in-phone-app": [],
  };

  const seen = new Set<string>();
  for (const action of actions.slice(0, 100)) {
    if (!action.id.trim() || !action.name.trim()) continue;
    if (seen.has(action.id)) continue;
    seen.add(action.id);
    buckets[action.kind].push(action);
  }

  let ok = true;
  for (const kind of EDITABLE_ACTION_KINDS) {
    const payload = buckets[kind].slice(0, 40).map(toSettingsRow);
    if (!writePhoneSetting(ctx, ACTION_KIND_SETTING_KEY[kind], payload)) {
      ok = false;
    }
  }
  return ok;
}

/**
 * 生成不冲突的新动作 id。
 *
 * @param existing - 已有 id 集合
 * @param base - 基础名
 * @returns 新 id
 *
 * @example
 * ```ts
 * nextCatalogActionId(new Set(["new-system-ui"]), "new-system-ui");
 * // => "new-system-ui-2"
 * ```
 */
export function nextCatalogActionId(
  existing: ReadonlySet<string>,
  base = "new-action",
): string {
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/**
 * 各 kind 新建时的默认 id / 名称前缀。
 */
const BLANK_ACTION_SEED: Record<
  EditableActionKind,
  { id: string; name: string }
> = {
  "program-ui": { id: "new-program-ui", name: "新程序界面" },
  "visual-ui": { id: "new-visual-ui", name: "新可视化界面" },
  "system-slot": { id: "new-system-ui", name: "新系统界面" },
  "local-command": { id: "new-internal-method", name: "新内部方法" },
  "in-phone-app": { id: "new-in-phone-app", name: "新手机内部应用" },
};

/**
 * 创建默认新动作行。
 *
 * @param kind - 动作种类
 * @param existingIds - 已有 id
 * @returns 新行
 */
export function createBlankCatalogAction(
  kind: EditableActionKind,
  existingIds: ReadonlySet<string>,
): EditableCatalogAction {
  const seed = BLANK_ACTION_SEED[kind];
  const id = nextCatalogActionId(existingIds, seed.id);

  return {
    kind,
    id,
    name: seed.name,
    description: "",
    programUiRef: "",
    visualUiName: "",
    modal: true,
    systemSlot: INTERNAL_SYSTEM_SLOT.Settings,
    commandId: "quick-save",
    phoneAppId: "",
  };
}

/**
 * 供应用属性下拉使用的动作选项。
 *
 * @param actions - 动作行
 * @returns `{ id, name, kindLabel }[]`
 */
export function actionSelectOptions(
  actions: readonly EditableCatalogAction[],
): Array<{ id: string; name: string; kindLabel: string }> {
  return actions.map((action) => ({
    id: action.id,
    name: action.name,
    kindLabel: ACTION_KIND_LABELS[action.kind],
  }));
}
