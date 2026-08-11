/**
 * @file phone-settings-bridge.ts
 * @description 兼容层：phone 模块读写改走通用 section-settings-bridge。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import { PHONE_HOST_EDITOR_SCHEMA } from "../schema/phone-host-editor-schema";
import {
  readModuleSetting,
  readSectionFieldValues,
  writeModuleSetting,
} from "../schema/section-settings-bridge";

/** 手机宿主扩展模块 id。 */
export const PHONE_MODULE_ID = PHONE_HOST_EDITOR_SCHEMA.settingsModuleId;

/**
 * 读取 phone 模块单个 setting。
 *
 * @param ctx - 扩展上下文
 * @param key - 字段名
 * @returns 原始值
 */
export function readPhoneSetting(
  ctx: ExtensionContext,
  key: string,
): unknown {
  return readModuleSetting(ctx, PHONE_MODULE_ID, key);
}

/**
 * 写入 phone 模块单个 setting。
 *
 * @param ctx - 扩展上下文
 * @param key - 字段名
 * @param value - 新值
 * @returns 是否成功
 */
export function writePhoneSetting(
  ctx: ExtensionContext,
  key: string,
  value: unknown,
): boolean {
  return writeModuleSetting(ctx, PHONE_MODULE_ID, key, value);
}

/** 外观字段值表。 */
export type PhoneAppearanceValues = Record<string, string>;

/**
 * 读取宿主手机 schema 全部 contentItems 值。
 *
 * @param ctx - 扩展上下文
 * @returns id → 字符串
 */
export function readPhoneAppearanceValues(
  ctx: ExtensionContext,
): PhoneAppearanceValues {
  return readSectionFieldValues(ctx, PHONE_HOST_EDITOR_SCHEMA);
}
