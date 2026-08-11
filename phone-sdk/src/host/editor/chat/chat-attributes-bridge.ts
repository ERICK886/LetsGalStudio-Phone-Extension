/**
 * @file chat-attributes-bridge.ts
 * @description 编辑器：读写 phone-chat.attributeFields。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import {
  readModuleSetting,
  writeModuleSetting,
} from "../schema/section-settings-bridge";
import { CHAT_SETTINGS_MODULE_ID } from "../schema/chat-app-editor-schema";

/** 可编辑属性槽行。 */
export interface EditableChatAttribute {
  id: string;
  label: string;
  variableKey: string;
}

/**
 * 规范化一行。
 *
 * @param raw - 原始元素
 * @returns 行或 null
 */
function normalizeRow(raw: unknown): EditableChatAttribute | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const label = typeof row.label === "string" ? row.label.trim() : "";
  if (!id || !label) return null;
  return {
    id: id.slice(0, 64),
    label: label.slice(0, 48),
    variableKey:
      typeof row.variableKey === "string" && row.variableKey.trim()
        ? row.variableKey.trim().slice(0, 128)
        : `friend.{characterId}.${id.slice(0, 32)}`,
  };
}

/**
 * 默认属性槽草稿（settings 为空时）。
 *
 * @returns 默认行
 */
export function defaultEditableChatAttributes(): EditableChatAttribute[] {
  return [
    {
      id: "mood",
      label: "心情",
      variableKey: "friend.{characterId}.mood",
    },
  ];
}

/**
 * 读取属性槽。
 *
 * @param ctx - 扩展上下文
 * @returns 属性行
 */
export function readEditableChatAttributes(
  ctx: ExtensionContext,
): EditableChatAttribute[] {
  const raw = readModuleSetting(ctx, CHAT_SETTINGS_MODULE_ID, "attributeFields");
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultEditableChatAttributes();
  }

  const rows: EditableChatAttribute[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 40)) {
    const row = normalizeRow(item);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows.length > 0 ? rows : defaultEditableChatAttributes();
}

/**
 * 写入 attributeFields。
 *
 * @param ctx - 扩展上下文
 * @param fields - 属性行
 * @returns 是否成功
 */
export function writeEditableChatAttributes(
  ctx: ExtensionContext,
  fields: readonly EditableChatAttribute[],
): boolean {
  const seen = new Set<string>();
  const payload: EditableChatAttribute[] = [];
  for (const field of fields.slice(0, 40)) {
    const id = field.id.trim();
    const label = field.label.trim();
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    payload.push({
      id: id.slice(0, 64),
      label: label.slice(0, 48),
      variableKey: (field.variableKey.trim() || `friend.{characterId}.${id}`).slice(
        0,
        128,
      ),
    });
  }
  return writeModuleSetting(
    ctx,
    CHAT_SETTINGS_MODULE_ID,
    "attributeFields",
    payload,
  );
}

/**
 * 生成不冲突属性 id。
 *
 * @param existing - 已有 id
 * @param base - 基础名
 * @returns 新 id
 */
export function nextChatAttributeId(
  existing: ReadonlySet<string>,
  base = "attr",
): string {
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/**
 * 创建空白属性槽。
 *
 * @param existingIds - 已有 id
 * @returns 新行
 */
export function createBlankChatAttribute(
  existingIds: ReadonlySet<string>,
): EditableChatAttribute {
  const id = nextChatAttributeId(existingIds);
  return {
    id,
    label: "新属性",
    variableKey: `friend.{characterId}.${id}`,
  };
}
