/**
 * @file capture-slot.ts
 * @description 为官方存档截图缓存选择不会覆盖玩家存档的临时槽位。
 */

import { CAPTURE_TEMP_SLOT } from "../constants";

/** 从起始值向上寻找首个未占用槽位。 */
export function chooseCaptureTempSlot(
  occupiedSlotIds: Iterable<number>,
  startAt = CAPTURE_TEMP_SLOT,
): number {
  const occupied = new Set(occupiedSlotIds);
  let candidate = startAt;
  while (occupied.has(candidate)) candidate += 1;
  return candidate;
}
