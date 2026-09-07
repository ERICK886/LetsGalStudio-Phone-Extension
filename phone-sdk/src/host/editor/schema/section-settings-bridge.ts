/**
 * @file section-settings-bridge.ts
 * @description 按分区 schema 跨模块读写 settings（contentItems 驱动）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import type {
  PhoneEditorContentItemSchema,
  PhoneEditorSectionSchema,
} from "../../../client/runtime/types";
import { contentItemSettingKey } from "./phone-host-editor-schema";

/**
 * 判断 setting 是否视为空。
 *
 * @param value - 原始值
 * @returns true 表示空
 */
function isBlankSetting(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return true;
  }

  return false;
}

/**
 * 将未知值规范为字符串。
 *
 * @param value - 原始值
 * @param fallback - 空时回退
 * @returns 字符串
 */
function toSettingString(value: unknown, fallback: string): string {
  if (isBlankSetting(value)) {
    return fallback;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

/**
 * 读取指定模块单个 setting。
 *
 * @param ctx - 扩展上下文
 * @param moduleId - 目标模块 id
 * @param key - 字段名
 * @returns 原始值；失败为 undefined
 */
export function readModuleSetting(
  ctx: ExtensionContext,
  moduleId: string,
  key: string,
): unknown {
  try {
    return ctx.settings.cross.get(moduleId, key);
  } catch (err) {
    console.warn(
      `[phone-editor] settings.cross.get("${moduleId}", "${key}") 失败`,
      err,
    );
    return undefined;
  }
}

/**
 * 写入指定模块单个 setting。
 *
 * @param ctx - 扩展上下文
 * @param moduleId - 目标模块 id
 * @param key - 字段名
 * @param value - 新值
 * @returns 是否成功
 */
export function writeModuleSetting(
  ctx: ExtensionContext,
  moduleId: string,
  key: string,
  value: unknown,
): boolean {
  try {
    ctx.settings.cross.set(moduleId, key, value);
    return true;
  } catch (err) {
    console.warn(
      `[phone-editor] settings.cross.set("${moduleId}", "${key}") 失败`,
      err,
    );
    return false;
  }
}

/**
 * 按 schema contentItems 读取全部字段值。
 *
 * @param ctx - 扩展上下文
 * @param schema - 分区 schema
 * @returns id → 字符串值
 */
export function readSectionFieldValues(
  ctx: ExtensionContext,
  schema: PhoneEditorSectionSchema,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const item of schema.contentItems) {
    const moduleId = item.settingsModuleId ?? schema.settingsModuleId;
    const key = contentItemSettingKey(item);
    const raw = readModuleSetting(ctx, moduleId, key);

    if (item.allowEmpty) {
      if (raw === undefined || raw === null) {
        result[item.id] = item.defaultValue;
      } else if (typeof raw === "string") {
        result[item.id] = raw;
      } else {
        result[item.id] = toSettingString(raw, item.defaultValue);
      }
      continue;
    }

    result[item.id] = toSettingString(raw, item.defaultValue);
  }

  return result;
}

/**
 * 写入单个内容项对应的 setting。
 *
 * @param ctx - 扩展上下文
 * @param schema - 分区 schema
 * @param item - 内容项
 * @param value - 新值（表单侧一律字符串；boolean 会写成真正的 boolean）
 * @returns 是否成功
 */
export function writeSectionContentItem(
  ctx: ExtensionContext,
  schema: PhoneEditorSectionSchema,
  item: PhoneEditorContentItemSchema,
  value: string,
): boolean {
  let payload: unknown = value;

  if (item.fieldType === "boolean") {
    payload = value === "true";
  } else if (item.fieldType === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return false;
    payload = Math.min(item.max ?? parsed, Math.max(item.min ?? parsed, parsed));
  }

  return writeModuleSetting(
    ctx,
    item.settingsModuleId ?? schema.settingsModuleId,
    contentItemSettingKey(item),
    payload,
  );
}
