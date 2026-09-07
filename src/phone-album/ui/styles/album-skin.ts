/**
 * @file album-skin.ts
 * @description 相册外观：CSS 变量映射、作者 CSS 消毒与注入。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */

import type React from "react";
import { DEFAULT_ALBUM_APPEARANCE } from "../../runtime/appearance-parse.ts";
import type { AlbumAppearanceSettings } from "../../types.ts";

/** 规格默认外观（与 settings 解析同源）。 */
export const ALBUM_SKIN_DEFAULTS: AlbumAppearanceSettings = DEFAULT_ALBUM_APPEARANCE;

const AUTHOR_CSS_SELECTOR = 'style[data-pa-author-css="phone-album"]';

const RADIUS_PX = { sm: 8, md: 12, lg: 16 } as const;
const GAP_PX = { sm: 6, md: 10, lg: 14 } as const;

export type AlbumSkinCssVars = React.CSSProperties &
  Record<`--pa-${string}`, string>;

/** 圆角档 → px。 */
export function mapRadiusPx(v: "sm" | "md" | "lg"): number {
  return RADIUS_PX[v];
}

/** 间距档 → px。 */
export function mapGapPx(v: "sm" | "md" | "lg"): number {
  return GAP_PX[v];
}

/** 去掉可破坏文档或外联资源的片段。 */
export function sanitizeAuthorCss(raw: string): string {
  return raw
    .replace(/<\/style>/gi, "")
    .replace(/@import\b[\s\S]*?(?:;|$)/gi, "")
    .replace(/<script\b[\s\S]*?(?:<\/script>|$)/gi, "");
}

/** 无 `{` 视为声明片段，包进 skin 作用域块。 */
export function wrapAuthorCss(sanitized: string): string {
  const text = sanitized.trim();
  if (!text) return "";
  if (text.includes("{")) return text;
  return `.pa-root[data-pa-author-skin] {\n  ${text}\n}`;
}

/** 根节点 inline CSS 变量。 */
export function buildAlbumSkinCssVars(
  appearance: AlbumAppearanceSettings,
): AlbumSkinCssVars {
  return {
    "--pa-bg": appearance.styleBg,
    "--pa-fg": appearance.styleFg,
    "--pa-fg-muted": appearance.styleFgMuted,
    "--pa-accent": appearance.styleAccent,
    "--pa-header-bg": appearance.styleHeaderBg,
    "--pa-tabbar-bg": appearance.styleTabbarBg,
    "--pa-card-bg": appearance.styleCardBg,
    "--pa-danger": appearance.styleDanger,
    "--pa-camera-bg": appearance.styleCameraBg,
    "--pa-viewer-bg": appearance.styleViewerBg,
    "--pa-home-columns": appearance.styleHomeColumns,
    "--pa-grid-columns": appearance.styleGridColumns,
    "--pa-radius": `${mapRadiusPx(appearance.styleRadius)}px`,
    "--pa-gap": `${mapGapPx(appearance.styleCardGap)}px`,
  } as AlbumSkinCssVars;
}

/** 根节点 data 属性（Tab 文案 / 作者 skin 标记）。 */
export function buildAlbumSkinDataAttrs(
  appearance: AlbumAppearanceSettings,
): Record<string, string> {
  const attrs: Record<string, string> = {
    "data-pa-tab-labels": appearance.styleShowTabLabels ? "1" : "0",
  };
  if (sanitizeAuthorCss(appearance.styleCustomCss).trim()) {
    attrs["data-pa-author-skin"] = "";
  }
  return attrs;
}

/** 在 document.head 维护唯一作者 CSS style 标签。 */
export function ensureAuthorCss(css: string): void {
  try {
    if (typeof document === "undefined") return;

    const sanitized = sanitizeAuthorCss(css).trim();
    const existing = document.head.querySelector(AUTHOR_CSS_SELECTOR);

    if (!sanitized) {
      existing?.remove();
      return;
    }

    const wrapped = wrapAuthorCss(sanitized);
    if (existing) {
      existing.textContent = wrapped;
      return;
    }

    const style = document.createElement("style");
    style.setAttribute("data-pa-author-css", "phone-album");
    style.textContent = wrapped;
    document.head.appendChild(style);
  } catch (error) {
    console.warn("[phone-album] ensureAuthorCss failed:", error);
  }
}

/** 移除作者 CSS style 标签。 */
export function clearAuthorCss(): void {
  try {
    if (typeof document === "undefined") return;
    document.head.querySelector(AUTHOR_CSS_SELECTOR)?.remove();
  } catch (error) {
    console.warn("[phone-album] clearAuthorCss failed:", error);
  }
}
