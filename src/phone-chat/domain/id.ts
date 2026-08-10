/**
 * @file id.ts
 * @description 生成消息 / 回复等稳定临时 ID。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

let seq = 0;

/**
 * 生成带前缀的唯一 ID。
 *
 * @param prefix - 前缀，如 `msg` / `reply`
 * @returns 唯一字符串
 */
export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`;
}
