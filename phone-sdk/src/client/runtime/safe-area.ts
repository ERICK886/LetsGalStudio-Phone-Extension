/**
 * @file safe-area.ts
 * @description Phone SDK 安全区常量与读取 API。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.1
 */

import { phoneSdkDebug } from "../debug/debug";
import { getPhoneSdkSlot } from "./slot";
import type { PhoneSafeAreaInsets } from "./types";


/**
 * 全零安全区；宿主尚未测量或未安装时作为回退值。
 */
export const EMPTY_PHONE_SAFE_AREA: PhoneSafeAreaInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/**
 * 规范化安全区数值：只保留有限非负数字，非法字段回退为 0。
 *
 * @param value 原始 insets
 * @returns 净化后的 insets
 */
export function normalizePhoneSafeAreaInsets(
  value: Partial<PhoneSafeAreaInsets> | null | undefined,
): PhoneSafeAreaInsets {
  const read = (input: unknown): number =>
    typeof input === "number" && Number.isFinite(input) && input >= 0 ? input : 0;

  return {
    top: read(value?.top),
    right: read(value?.right),
    bottom: read(value?.bottom),
    left: read(value?.left),
  };
}

/**
 * 读取宿主最近发布的手机安全区（CSS 像素）。
 *
 * @returns 当前安全区；宿主未就绪时返回全零
 *
 * @example
 * ```ts
 * const { top, bottom } = getPhoneSafeAreaInsets();
 * ```
 */
export function getPhoneSafeAreaInsets(): PhoneSafeAreaInsets {
  return normalizePhoneSafeAreaInsets(getPhoneSdkSlot().safeAreaInsets);
}

/**
 * 由手机扩展宿主发布安全区测量结果，供 `getPhoneSafeAreaInsets` 与内页 render props 使用。
 *
 * @param insets 测量得到的安全区
 * @returns 规范化后写入槽位的值
 *
 * @remarks 第三方扩展一般不需要调用；仅宿主在布局变化时调用。
 */
export function publishPhoneSafeAreaInsets(
  insets: PhoneSafeAreaInsets,
): PhoneSafeAreaInsets {
  const normalized = normalizePhoneSafeAreaInsets(insets);
  const slot = getPhoneSdkSlot();
  const prev = slot.safeAreaInsets;
  slot.safeAreaInsets = normalized;

  // 数值变化才打日志，避免 ResizeObserver 刷屏。
  if (
    !prev ||
    prev.top !== normalized.top ||
    prev.right !== normalized.right ||
    prev.bottom !== normalized.bottom ||
    prev.left !== normalized.left
  ) {
    phoneSdkDebug("publishPhoneSafeAreaInsets", {
      previous: prev ?? null,
      next: normalized,
      note: "top 应为状态栏高度；bottom 应为 Home 条高度",
    });
  }

  return normalized;
}
