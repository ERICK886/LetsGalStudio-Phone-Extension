/**
 * @file appearance-parse.ts
 * @description 相册外观 settings 纯解析与默认值。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */

import type { AlbumAppearanceSettings } from "../types";

/** 外观 settings 默认值（对齐设计规格）。 */
export const DEFAULT_ALBUM_APPEARANCE: AlbumAppearanceSettings = {
  styleBg: "#0F1419",
  styleFg: "#F5F5F5",
  styleFgMuted: "rgba(255,255,255,0.45)",
  styleAccent: "#7EC8FF",
  styleHeaderBg: "#0F1419",
  styleTabbarBg: "rgba(12,16,22,0.96)",
  styleCardBg: "#1C232F",
  styleDanger: "#FF6B7A",
  styleCameraBg: "#05070A",
  styleViewerBg: "#000000",
  styleHomeColumns: "2",
  styleGridColumns: "3",
  styleRadius: "md",
  styleCardGap: "md",
  styleShowTabLabels: true,
  styleCustomCss: "",
};

const HOME_COLUMNS = ["2", "3"] as const;
const GRID_COLUMNS = ["3", "4"] as const;
const SIZE_TOKENS = ["sm", "md", "lg"] as const;

function parseColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (typeof value !== "string") return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseCss(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return value;
}

/**
 * 从 settings 原始键值解析外观快照。
 *
 * @param raw - `ctx.settings.get` 或编辑器 values 映射
 * @returns 规范化后的外观设置
 */
export function parseAppearanceFromSettings(
  raw: Record<string, unknown>,
): AlbumAppearanceSettings {
  const d = DEFAULT_ALBUM_APPEARANCE;
  return {
    styleBg: parseColor(raw.styleBg, d.styleBg),
    styleFg: parseColor(raw.styleFg, d.styleFg),
    styleFgMuted: parseColor(raw.styleFgMuted, d.styleFgMuted),
    styleAccent: parseColor(raw.styleAccent, d.styleAccent),
    styleHeaderBg: parseColor(raw.styleHeaderBg, d.styleHeaderBg),
    styleTabbarBg: parseColor(raw.styleTabbarBg, d.styleTabbarBg),
    styleCardBg: parseColor(raw.styleCardBg, d.styleCardBg),
    styleDanger: parseColor(raw.styleDanger, d.styleDanger),
    styleCameraBg: parseColor(raw.styleCameraBg, d.styleCameraBg),
    styleViewerBg: parseColor(raw.styleViewerBg, d.styleViewerBg),
    styleHomeColumns: parseEnum(raw.styleHomeColumns, HOME_COLUMNS, d.styleHomeColumns),
    styleGridColumns: parseEnum(raw.styleGridColumns, GRID_COLUMNS, d.styleGridColumns),
    styleRadius: parseEnum(raw.styleRadius, SIZE_TOKENS, d.styleRadius),
    styleCardGap: parseEnum(raw.styleCardGap, SIZE_TOKENS, d.styleCardGap),
    styleShowTabLabels: parseBoolean(raw.styleShowTabLabels, d.styleShowTabLabels),
    styleCustomCss: parseCss(raw.styleCustomCss, d.styleCustomCss),
  };
}

/** 外观 settings 键（供 ALBUM_SETTINGS_KEYS 合并）。 */
export const ALBUM_APPEARANCE_SETTINGS_KEYS = [
  "styleBg",
  "styleFg",
  "styleFgMuted",
  "styleAccent",
  "styleHeaderBg",
  "styleTabbarBg",
  "styleCardBg",
  "styleDanger",
  "styleCameraBg",
  "styleViewerBg",
  "styleHomeColumns",
  "styleGridColumns",
  "styleRadius",
  "styleCardGap",
  "styleShowTabLabels",
  "styleCustomCss",
] as const;
