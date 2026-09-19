/**
 * @file phone-hud-config.ts
 * @description 手机 HUD 按钮的共享配置、预设与归一化逻辑。
 */

export const PHONE_HUD_BUTTON_TYPES = ["icon", "text", "image"] as const;
export type PhoneHudButtonType = (typeof PHONE_HUD_BUTTON_TYPES)[number];

export const PHONE_HUD_ICON_PRESETS = [
  "phone",
  "grid",
  "menu",
  "message",
  "settings",
  "star",
] as const;
export type PhoneHudIconPreset = (typeof PHONE_HUD_ICON_PRESETS)[number];

export const PHONE_HUD_STYLE_PRESETS = [
  "dark-glass",
  "light",
  "accent",
  "transparent",
  "custom",
] as const;
export type PhoneHudStylePreset = (typeof PHONE_HUD_STYLE_PRESETS)[number];

export const PHONE_HUD_SETTING_KEYS = [
  "showPhoneHudButton",
  "phoneHudButtonType",
  "phoneHudText",
  "phoneHudIconPreset",
  "phoneHudIcon",
  "phoneHudImage",
  "phoneHudStylePreset",
  "phoneHudBackgroundImage",
  "phoneHudBackgroundColor",
  "phoneHudTextColor",
  "phoneHudBorderColor",
  "phoneHudBorderWidth",
  "phoneHudBorderRadius",
  "phoneHudPosition",
  "phoneHudOffsetX",
  "phoneHudOffsetY",
  "phoneHudSize",
  "phoneHudWidth",
  "phoneHudContentSize",
] as const;

const PHONE_HUD_ICON_GLYPHS: Record<PhoneHudIconPreset, string> = {
  phone: "📱",
  grid: "▦",
  menu: "☰",
  message: "💬",
  settings: "⚙",
  star: "★",
};

interface PhoneHudPresetColors {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  boxShadow: string;
  backdropBlur: number;
}

const PHONE_HUD_PRESET_COLORS: Record<Exclude<PhoneHudStylePreset, "custom">, PhoneHudPresetColors> = {
  "dark-glass": {
    backgroundColor: "rgba(18,22,31,.82)",
    textColor: "#ffffff",
    borderColor: "rgba(255,255,255,.58)",
    boxShadow: "0 4px 18px rgba(0,0,0,.34)",
    backdropBlur: 8,
  },
  light: {
    backgroundColor: "rgba(255,255,255,.92)",
    textColor: "#1f2937",
    borderColor: "rgba(15,23,42,.2)",
    boxShadow: "0 4px 18px rgba(15,23,42,.2)",
    backdropBlur: 8,
  },
  accent: {
    backgroundColor: "rgba(37,99,235,.94)",
    textColor: "#ffffff",
    borderColor: "rgba(219,234,254,.78)",
    boxShadow: "0 6px 20px rgba(37,99,235,.34)",
    backdropBlur: 0,
  },
  transparent: {
    backgroundColor: "transparent",
    textColor: "#ffffff",
    borderColor: "transparent",
    boxShadow: "none",
    backdropBlur: 0,
  },
};

export interface PhoneHudConfigInput {
  buttonType?: unknown;
  text?: unknown;
  iconPreset?: unknown;
  stylePreset?: unknown;
  backgroundColor?: unknown;
  textColor?: unknown;
  borderColor?: unknown;
  borderWidth?: unknown;
  borderRadius?: unknown;
  size?: unknown;
  width?: unknown;
  contentSize?: unknown;
}

export interface ResolvedPhoneHudConfig {
  buttonType: PhoneHudButtonType;
  text: string;
  iconPreset: PhoneHudIconPreset;
  iconGlyph: string;
  stylePreset: PhoneHudStylePreset;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  height: number;
  /** 0 表示按按钮类型自动计算。 */
  width: number;
  contentSize: number;
  boxShadow: string;
  backdropBlur: number;
}

function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T)
    ? value as T
    : fallback;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** 将 Settings / 编辑器字符串值归一化为 HUD 渲染配置。 */
export function resolvePhoneHudConfig(input: PhoneHudConfigInput): ResolvedPhoneHudConfig {
  const buttonType = oneOf(input.buttonType, PHONE_HUD_BUTTON_TYPES, "icon");
  const iconPreset = oneOf(input.iconPreset, PHONE_HUD_ICON_PRESETS, "phone");
  const stylePreset = oneOf(input.stylePreset, PHONE_HUD_STYLE_PRESETS, "dark-glass");
  const height = boundedNumber(input.size, 56, 24, 240);
  const requestedContentSize = boundedNumber(input.contentSize, 0, 0, 200);
  const contentSize = requestedContentSize > 0
    ? requestedContentSize
    : buttonType === "text"
      ? Math.max(12, Math.round(height * 0.3))
      : Math.max(14, Math.round(height * 0.58));
  const preset = stylePreset === "custom"
    ? {
        backgroundColor: nonEmptyString(input.backgroundColor, "#12161F"),
        textColor: nonEmptyString(input.textColor, "#ffffff"),
        borderColor: nonEmptyString(input.borderColor, "#FFFFFF"),
        boxShadow: "0 4px 18px rgba(0,0,0,.34)",
        backdropBlur: 8,
      }
    : PHONE_HUD_PRESET_COLORS[stylePreset];

  return {
    buttonType,
    text: nonEmptyString(input.text, "打开手机"),
    iconPreset,
    iconGlyph: PHONE_HUD_ICON_GLYPHS[iconPreset],
    stylePreset,
    ...preset,
    borderWidth: boundedNumber(input.borderWidth, 1, 0, 12),
    borderRadius: boundedNumber(input.borderRadius, 16, 0, 120),
    height,
    width: boundedNumber(input.width, 0, 0, 400),
    contentSize,
  };
}
