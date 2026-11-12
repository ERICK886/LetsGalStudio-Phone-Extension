import { computePhoneViewportFit, type PhoneViewportStylePreset } from "./phone-viewport-fit";

export const PHONE_DOCK_TRANSITION_MS = 320;

function finite(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

/** All coordinates use the game UI Host's local CSS pixels, never window.innerWidth. */
export function computePhoneDockLayout(input: {
  width: number;
  height: number;
  stylePreset: PhoneViewportStylePreset;
  openPosition: string;
  dockPosition?: string;
  scale?: unknown;
  peek?: unknown;
  offsetX?: unknown;
  offsetY?: unknown;
}) {
  const width = finite(input.width, 0, 0, 100000);
  const height = finite(input.height, 0, 0, 100000);
  const fit = computePhoneViewportFit(input.stylePreset, Math.max(0, width - 40), Math.max(0, height - 40));
  const scale = finite(input.scale, 0.6, 0.25, 1);
  const dockWidth = fit.width * scale;
  const dockHeight = fit.height * scale;
  const offsetX = finite(input.offsetX, 0, -1000, 1000);
  const offsetY = finite(input.offsetY, 0, -1000, 1000);
  const position = !input.dockPosition || input.dockPosition === "follow-phone"
    ? input.openPosition === "center" ? "bottom-center" : input.openPosition
    : input.dockPosition;
  const side = position.startsWith("top-") ? "top"
    : position.startsWith("middle-") ? (position.endsWith("left") ? "left" : "right")
      : "bottom";
  const peek = Math.min(finite(input.peek, 32, 24, 96), side === "left" || side === "right" ? dockWidth : dockHeight);
  const x = position.endsWith("left") ? 20 : position.endsWith("center") ? (width - dockWidth) / 2 : width - 20 - dockWidth;
  const clampX = (value: number) => Math.max(0, Math.min(Math.max(0, width - dockWidth), value));
  const clampY = (value: number) => Math.max(0, Math.min(Math.max(0, height - dockHeight), value));
  const dockX = side === "left" ? -dockWidth + peek : side === "right" ? width - peek : clampX(x + offsetX);
  const dockY = side === "top" ? -dockHeight + peek : side === "bottom" ? height - peek : clampY((height - dockHeight) / 2 + offsetY);
  const openX = input.openPosition.endsWith("left") ? 20 : input.openPosition.endsWith("right") ? width - 20 - fit.width : (width - fit.width) / 2;
  const openY = input.openPosition.startsWith("top-") ? 20 : input.openPosition.startsWith("bottom-") ? height - 20 - fit.height : (height - fit.height) / 2;
  return {
    fit, scale, peek, dockX, dockY, openX, openY,
    transform: `translate3d(${dockX - openX}px, ${dockY - openY}px, 0) scale(${scale})`,
  };
}
