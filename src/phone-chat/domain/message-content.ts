/**
 * @file message-content.ts
 * @description 消息内容类型归一化与入列槽位解析。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */

import type { MessageContentType } from "../types/index";

export type { MessageContentType };

/**
 * 将 Studio / 存档原始值归一化为消息内容类型。
 *
 * @param raw - 原始 contentType
 * @returns `"image"` 或缺省/非法时的 `"text"`
 */
export function normalizeContentType(raw: unknown): MessageContentType {
  return raw === "image" ? "image" : "text";
}

/**
 * 解析单条消息/回复槽；空槽返回 null。
 *
 * @param input - 槽位原始字段
 * @returns 有效文字或图片槽，否则 null
 */
export function resolveMessageSlot(input: {
  contentType: unknown;
  text: unknown;
  imageAsset: unknown;
  textMax?: number;
}):
  | { contentType: "text"; text: string }
  | { contentType: "image"; imageAsset: string }
  | null {
  const contentType = normalizeContentType(input.contentType);

  if (contentType === "image") {
    const imageAsset =
      typeof input.imageAsset === "string" ? input.imageAsset.trim() : "";
    if (!imageAsset) return null;
    return { contentType: "image", imageAsset };
  }

  let text = typeof input.text === "string" ? input.text.trim() : "";
  if (!text) return null;

  if (
    input.textMax !== undefined &&
    input.textMax >= 0 &&
    text.length > input.textMax
  ) {
    text = text.slice(0, input.textMax);
  }

  return { contentType: "text", text };
}
