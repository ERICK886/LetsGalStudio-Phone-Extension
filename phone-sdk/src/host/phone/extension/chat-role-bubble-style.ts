/**
 * @file chat-role-bubble-style.ts
 * @description 聊天角色预设气泡样式：字段消毒、归一化与 bubble/body/name 三段 style 合并。
 * @author 池水三两升
 * @date 2026-08-04
 * @version 0.4.4
 */

import { sanitizeBackgroundCss } from "../catalog/preferences.ts";

/** 已归一化、可直接参与 style 合并的气泡样式字段。 */
export interface ChatRoleBubbleStyleFields {
  /** 正文字号，如 `14px` / `1rem`。 */
  fontSize?: string;
  /** 正文文字色，hex。 */
  textColor?: string;
  /** 名称（strong）文字色，hex。 */
  nameColor?: string;
  /** 气泡背景：hex 或单段安全 background 值。 */
  bubbleColor?: string;
  /** 已消毒的多声明 CSS 串（分号分隔）。 */
  customCss?: string;
}

/** 合并后的三段 inline style，键为 camelCase CSS 属性名。 */
export interface BubbleStyleParts {
  bubble: Record<string, string>;
  name: Record<string, string>;
  body: Record<string, string>;
}

/** 合法 hex：`#RGB` / `#RRGGBB` / `#RRGGBBAA`。 */
const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** 带单位的字号：`14px`、`1rem`、`1.25em`。 */
const FONT_SIZE_WITH_UNIT_PATTERN = /^(\d+(?:\.\d+)?)(px|rem|em)$/i;

/** 纯数字字号（视为 px）。 */
const FONT_SIZE_NUMBER_PATTERN = /^(\d+(?:\.\d+)?)$/;

/** 自定义 CSS 属性名白名单：`[a-zA-Z-]+`。 */
const CUSTOM_CSS_PROPERTY_PATTERN = /^[a-zA-Z-]+$/;

/** 值侧危险模式：`expression(...)`、`javascript:`。 */
const UNSAFE_CSS_VALUE_PATTERN = /expression\s*\(|javascript\s*:/i;

/** 建议字号等价范围（px）：10–32。 */
const MIN_FONT_SIZE_PX = 10;
const MAX_FONT_SIZE_PX = 32;

/** rem/em 换算基准（与常见浏览器默认一致）。 */
const ROOT_FONT_SIZE_PX = 16;

/**
 * 将 kebab-case CSS 属性名转为 camelCase；CSS 变量（`--*`）保持原样。
 *
 * @param property - 原始属性名，如 `font-size` 或 `--phone-name-color`
 * @returns React inline style 可用的键名
 *
 * @example
 * kebabToCamelProperty("font-size") // "fontSize"
 * kebabToCamelProperty("--phone-name-color") // "--phone-name-color"
 */
function kebabToCamelProperty(property: string): string {
  if (property.startsWith("--")) {
    return property;
  }

  return property.replace(/-([a-z])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
}

/**
 * 将字号换算为 px 等价，用于 10–32px 范围校验。
 *
 * @param amount - 数值部分
 * @param unit - `px` / `rem` / `em`
 * @returns px 等价；无法识别单位时返回 `NaN`
 */
function fontSizeToPxEquivalent(amount: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case "px":
      return amount;
    case "rem":
    case "em":
      return amount * ROOT_FONT_SIZE_PX;
    default:
      return Number.NaN;
  }
}

/**
 * 解析已消毒的 customCss 为 camelCase 声明 map。
 *
 * @param customCss - 分号分隔的 `property: value` 列表
 * @returns 属性键（camelCase）到值的映射；空串返回空对象
 *
 * @example
 * parseCustomCssDeclarations("font-size: 16px; color: #fff")
 * // { fontSize: "16px", color: "#fff" }
 */
function parseCustomCssDeclarations(
  customCss: string,
): Record<string, string> {
  const declarations: Record<string, string> = {};

  for (const segment of customCss.split(";")) {
    const part = segment.trim();
    if (!part) continue;

    const colonIndex = part.indexOf(":");
    if (colonIndex <= 0) continue;

    const rawProperty = part.slice(0, colonIndex).trim();
    const value = part.slice(colonIndex + 1).trim();
    if (!rawProperty || !value) continue;

    declarations[kebabToCamelProperty(rawProperty)] = value;
  }

  return declarations;
}

/**
 * 归一化 hex 颜色。
 *
 * @param value - 原始输入
 * @returns 小写 hex 字符串；非法则 `undefined`
 *
 * @example
 * normalizeHexColor("#FF0000") // "#ff0000"
 * normalizeHexColor("red") // undefined
 */
export function normalizeHexColor(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const color = value.trim();
  if (!HEX_COLOR_PATTERN.test(color)) {
    return undefined;
  }

  return color.toLowerCase();
}

/**
 * 归一化字号：纯数字补 `px`；允许 `px`/`rem`/`em`；等价 10–32px 外丢弃。
 *
 * @param value - 原始输入，如 `"14"`、`"16px"`、`"1rem"`
 * @returns 可直接用于 `fontSize` 的字符串；非法则 `undefined`
 *
 * @example
 * normalizeFontSize("14") // "14px"
 * normalizeFontSize("9px") // undefined
 */
export function normalizeFontSize(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const withUnit = trimmed.match(FONT_SIZE_WITH_UNIT_PATTERN);
  let amount: number;
  let unit: string;

  if (withUnit) {
    amount = Number.parseFloat(withUnit[1] ?? "");
    unit = (withUnit[2] ?? "px").toLowerCase();
  } else if (FONT_SIZE_NUMBER_PATTERN.test(trimmed)) {
    amount = Number.parseFloat(trimmed);
    unit = "px";
  } else {
    return undefined;
  }

  if (!Number.isFinite(amount)) {
    return undefined;
  }

  const pxEquivalent = fontSizeToPxEquivalent(amount, unit);
  if (
    !Number.isFinite(pxEquivalent) ||
    pxEquivalent < MIN_FONT_SIZE_PX ||
    pxEquivalent > MAX_FONT_SIZE_PX
  ) {
    return undefined;
  }

  if (withUnit) {
    return `${amount}${unit}`;
  }

  return `${amount}px`;
}

/**
 * 归一化气泡背景色：优先 hex；否则复用壁纸同款 `sanitizeBackgroundCss`。
 *
 * @param value - 原始输入
 * @returns 安全 background / color 字符串；非法则 `undefined`
 *
 * @example
 * normalizeBubbleColor("#abc") // "#abc"
 * normalizeBubbleColor("linear-gradient(180deg, #111, #222)") // 原串
 */
export function normalizeBubbleColor(value: unknown): string | undefined {
  const hex = normalizeHexColor(value);
  if (hex) {
    return hex;
  }

  return sanitizeBackgroundCss(value);
}

/**
 * 消毒聊天角色 customCss：仅允许多声明列表，禁 `url(` / `@` / 花括号等。
 *
 * @param value - 作者填写的 multiline CSS 声明串
 * @returns trim 后的安全原串；任一声明非法则整段 `undefined`
 *
 * @example
 * sanitizeBubbleCustomCss("padding: 4px; color: #fff") // 原串
 * sanitizeBubbleCustomCss("background: url(x)") // undefined
 */
export function sanitizeBubbleCustomCss(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const css = value.trim();
  if (!css || css.length > 2048) {
    return undefined;
  }

  if (/url\s*\(/i.test(css) || /[@{}]/.test(css)) {
    return undefined;
  }

  const segments = css.split(";").map((part) => part.trim()).filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }

  for (const segment of segments) {
    const colonIndex = segment.indexOf(":");
    if (colonIndex <= 0) {
      return undefined;
    }

    const property = segment.slice(0, colonIndex).trim();
    const propertyValue = segment.slice(colonIndex + 1).trim();

    if (
      !property ||
      !propertyValue ||
      !CUSTOM_CSS_PROPERTY_PATTERN.test(property) ||
      UNSAFE_CSS_VALUE_PATTERN.test(propertyValue)
    ) {
      return undefined;
    }
  }

  return css;
}

/**
 * 从预设 raw 对象提取并消毒全部气泡样式字段。
 *
 * @param raw - settings / JSON 中的单条预设片段
 * @returns 仅含合法字段的对象；非法项静默丢弃
 *
 * @example
 * normalizeChatRoleBubbleStyle({ fontSize: "14", textColor: "#fff" })
 * // { fontSize: "14px", textColor: "#fff" }
 */
export function normalizeChatRoleBubbleStyle(
  raw: Record<string, unknown>,
): ChatRoleBubbleStyleFields {
  const style: ChatRoleBubbleStyleFields = {};

  const fontSize = normalizeFontSize(raw.fontSize);
  if (fontSize) {
    style.fontSize = fontSize;
  }

  const textColor = normalizeHexColor(raw.textColor);
  if (textColor) {
    style.textColor = textColor;
  }

  const nameColor = normalizeHexColor(raw.nameColor);
  if (nameColor) {
    style.nameColor = nameColor;
  }

  const bubbleColor = normalizeBubbleColor(raw.bubbleColor);
  if (bubbleColor) {
    style.bubbleColor = bubbleColor;
  }

  const customCss = sanitizeBubbleCustomCss(raw.customCss);
  if (customCss) {
    style.customCss = customCss;
  }

  return style;
}

/**
 * 将结构化字段与 customCss 合并为 bubble / body / name 三段 style。
 *
 * 合并规则（锁定）：
 * 1. 结构化 → `body.fontSize` / `body.color` / `name.color` / `bubble.background`
 * 2. 解析 `customCss` 为声明 map（kebab→camel）
 * 3. map 全部合并进 `bubble`；其中 `fontSize`/`color` 同时合并进 `body`（customCss 覆盖结构化）
 * 4. `name` 默认仅结构化 `nameColor`；若 customCss 含 `--phone-name-color` 则写入 `name.color`
 *
 * @param style - 已归一化的样式字段
 * @returns 三段 inline style 对象
 *
 * @example
 * buildBubbleStyleParts({
 *   bubbleColor: "#111",
 *   customCss: "background: #222; font-size: 18px",
 * })
 * // bubble.background 被 customCss 覆盖；body.fontSize 为 18px
 */
export function buildBubbleStyleParts(
  style: ChatRoleBubbleStyleFields,
): BubbleStyleParts {
  const bubble: Record<string, string> = {};
  const name: Record<string, string> = {};
  const body: Record<string, string> = {};

  if (style.fontSize) {
    body.fontSize = style.fontSize;
  }

  if (style.textColor) {
    body.color = style.textColor;
  }

  if (style.nameColor) {
    name.color = style.nameColor;
  }

  if (style.bubbleColor) {
    bubble.background = style.bubbleColor;
  }

  if (style.customCss) {
    const declarations = parseCustomCssDeclarations(style.customCss);

    for (const [key, value] of Object.entries(declarations)) {
      bubble[key] = value;

      if (key === "fontSize") {
        body.fontSize = value;
      } else if (key === "color") {
        body.color = value;
      } else if (key === "--phone-name-color") {
        name.color = value;
      }
    }
  }

  return { bubble, name, body };
}
