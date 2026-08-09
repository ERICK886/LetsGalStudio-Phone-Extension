/**
 * @file parse.ts
 * @description 方法参数解析纯函数：id 规范化、逗号分隔 albumIds、媒体类型解析。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import type { MediaType } from "../types.js";
import { normalizeId } from "./id.js";

export { normalizeId };

/**
 * 解析逗号分隔的 albumIds 字符串：按半角 / 全角逗号拆分、去空白、去空、去重保序。
 *
 * @param raw - 原始输入（通常为作者设置或方法参数中的字符串）。
 * @returns 去重保序后的 id 数组；空串 / 非字符串 → `[]`。
 *
 * @example
 * parseCommaIds("a, b, a"); // ["a", "b"]
 * parseCommaIds("");        // []
 * parseCommaIds("a，b");    // ["a", "b"]
 */
export function parseCommaIds(raw: unknown): string[] {
  const text = typeof raw === "string" ? raw : String(raw ?? "");
  if (text.trim() === "") return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[,，]/)) {
    const id = part.trim();
    if (id === "" || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * 解析媒体类型：小写后仅接受 `"image"` / `"video"`，其余返回 `null`。
 *
 * @param raw - 原始输入。
 * @returns `"image"` / `"video"` 或 `null`。
 *
 * @example
 * parseMediaType("image"); // "image"
 * parseMediaType("VIDEO"); // "video"
 * parseMediaType("gif");   // null
 */
export function parseMediaType(raw: unknown): MediaType | null {
  if (typeof raw !== "string") return null;
  const v = raw.toLowerCase();
  if (v === "image" || v === "video") return v;
  return null;
}
