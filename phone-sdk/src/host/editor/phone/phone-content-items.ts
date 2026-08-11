/**
 * @file phone-content-items.ts
 * @description 兼容层：内容项类型与目录改由分区 schema 提供。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 *
 * @remarks
 * 真源为 `PHONE_HOST_EDITOR_SCHEMA.contentItems`；本文件仅做别名导出，避免旧引用断裂。
 */

import type {
  PhoneEditorContentItemSchema,
  PhoneEditorEnumOption,
  PhoneEditorFieldType,
} from "../../../client/runtime/types";
import {
  PHONE_HOST_CONTENT_ITEMS,
  getSectionContentItem,
  PHONE_HOST_EDITOR_SCHEMA,
} from "../schema/phone-host-editor-schema";

/** @deprecated 使用 PhoneEditorFieldType */
export type PhoneContentFieldType = PhoneEditorFieldType;

/** @deprecated 使用 string（schema 驱动） */
export type PhoneContentItemId = string;

/** @deprecated 使用 PhoneEditorEnumOption */
export type PhoneContentEnumOption = PhoneEditorEnumOption;

/** @deprecated 使用 PhoneEditorContentItemSchema */
export type PhoneContentItem = PhoneEditorContentItemSchema;

/** 宿主手机内容项（来自 schema）。 */
export const PHONE_CONTENT_ITEMS = PHONE_HOST_CONTENT_ITEMS;

/**
 * 按 id 查找宿主手机内容项。
 *
 * @param id - 内容项 id
 * @returns 内容项；不存在则 undefined
 */
export function getPhoneContentItem(
  id: string,
): PhoneEditorContentItemSchema | undefined {
  return getSectionContentItem(PHONE_HOST_EDITOR_SCHEMA, id);
}

/**
 * 默认选中项 id。
 *
 * @returns 首个内容项 id
 */
export function defaultPhoneContentItemId(): string {
  return PHONE_HOST_CONTENT_ITEMS[0]?.id ?? "phoneTitle";
}

/**
 * 将内容项按 group 分组。
 *
 * @param items - 内容项列表
 * @returns 分组数组
 */
export function groupPhoneContentItems(
  items: readonly PhoneEditorContentItemSchema[] = PHONE_HOST_CONTENT_ITEMS,
): Array<{ group: string; items: PhoneEditorContentItemSchema[] }> {
  const order: string[] = [];
  const map = new Map<string, PhoneEditorContentItemSchema[]>();

  for (const item of items) {
    if (!map.has(item.group)) {
      order.push(item.group);
      map.set(item.group, []);
    }
    map.get(item.group)!.push(item);
  }

  return order.map((group) => ({
    group,
    items: map.get(group) ?? [],
  }));
}
