/**
 * @file id.ts
 * @description 相册 / 媒体 id 规范化纯函数。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

/**
 * 规范化 id：去空白；非字符串或全空白返回空串。
 *
 * @param raw - 原始输入（可能为 string / null / undefined / 其他）。
 * @returns 去首尾空白后的字符串；null / undefined / 纯空白 → `""`。
 *
 * @example
 * normalizeId("  a1  "); // "a1"
 * normalizeId(null);      // ""
 * normalizeId("   ");     // ""
 */
export function normalizeId(raw: unknown): string {
  return String(raw ?? "").trim();
}
