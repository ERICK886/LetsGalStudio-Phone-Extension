/**
 * @file useSafeAreaStyle.ts
 * @description 将 Phone SDK 安全区 insets 转为根容器 padding。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * 与 chat 内页对齐：默认完整 padding；可传 `includeBottom:false` 把底部
 * 交给贴底控件自行吸收。
 */

import type { PhoneAppRenderProps } from "@ink-zenly/phone-sdk/plugin";
import type React from "react";
import { useMemo } from "react";

/** useSafeAreaStyle 可选配置。 */
export interface UseSafeAreaStyleOptions {
  /**
   * 是否把 bottom inset 写入 paddingBottom。
   * - true（默认）：根容器底部留白
   * - false：paddingBottom 为 0，由贴底控件吸收安全区
   */
  includeBottom?: boolean;
}

/**
 * 将 Phone SDK 安全区 insets 转为根容器 CSS padding。
 *
 * @param safeAreaInsets - PhoneAppRenderProps.safeAreaInsets
 * @param options - 可选配置；`includeBottom` 默认 true
 * @returns React.CSSProperties（paddingTop/Right/Bottom/Left）
 *
 * @example
 * ```ts
 * const style = useSafeAreaStyle(safeAreaInsets);
 * const homeStyle = useSafeAreaStyle(safeAreaInsets, { includeBottom: false });
 * ```
 */
export function useSafeAreaStyle(
  safeAreaInsets: PhoneAppRenderProps["safeAreaInsets"],
  options?: UseSafeAreaStyleOptions,
): React.CSSProperties {
  const includeBottom = options?.includeBottom !== false;

  return useMemo(
    () => ({
      paddingTop: safeAreaInsets.top,
      paddingRight: Math.max(8, safeAreaInsets.right),
      paddingBottom: includeBottom ? safeAreaInsets.bottom : 0,
      paddingLeft: Math.max(8, safeAreaInsets.left),
    }),
    [
      safeAreaInsets.top,
      safeAreaInsets.right,
      safeAreaInsets.bottom,
      safeAreaInsets.left,
      includeBottom,
    ],
  );
}
