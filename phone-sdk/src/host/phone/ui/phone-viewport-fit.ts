/**
 * @file phone-viewport-fit.ts
 * @description 将固定设计尺寸的手机等比缩放到宿主可用视口。
 */

export type PhoneViewportStylePreset = "apple" | "android";

export interface PhoneViewportFit {
  scale: number;
  width: number;
  height: number;
  designWidth: number;
  designHeight: number;
}

export const PHONE_VIEWPORT_DESIGN_SIZE: Record<
  PhoneViewportStylePreset,
  { width: number; height: number }
> = {
  apple: { width: 390, height: 780 },
  android: { width: 400, height: 760 },
};

/**
 * 计算手机在可用内容区内的等比缩放结果。
 *
 * 宽高必须使用同一个 scale；分别截断宽高会导致手机被纵向压扁。
 */
export function computePhoneViewportFit(
  stylePreset: PhoneViewportStylePreset,
  availableWidth: number,
  availableHeight: number,
): PhoneViewportFit {
  const design = PHONE_VIEWPORT_DESIGN_SIZE[stylePreset];
  const safeWidth = Number.isFinite(availableWidth) && availableWidth > 0
    ? availableWidth
    : design.width;
  const safeHeight = Number.isFinite(availableHeight) && availableHeight > 0
    ? availableHeight
    : design.height;
  const scale = Math.min(1, safeWidth / design.width, safeHeight / design.height);

  return {
    scale,
    width: design.width * scale,
    height: design.height * scale,
    designWidth: design.width,
    designHeight: design.height,
  };
}
