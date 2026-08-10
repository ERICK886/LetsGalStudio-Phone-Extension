/**
 * @file font-awesome.ts
 * @description 注入 Font Awesome CDN 样式（手机编辑器外壳与后续面板共用）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * 对齐场景交互编辑器做法：运行时幂等注入 `<link>`，避免打包字体资源。
 * 版本与旁路仓 `ext-27b96b` 一致（FA 7.3.0）。
 */

/** Font Awesome 7.3.0 all.min.css（含 solid / regular / brands） */
export const FONT_AWESOME_CSS_HREF =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.0/css/all.min.css";

/** 文档级唯一 id，防止重复注入。 */
const LINK_ID = "ink-zenly-phone-sdk-editor-font-awesome";

/**
 * 确保页面已加载 Font Awesome CSS（幂等）。
 *
 * @returns void
 *
 * @example
 * ```ts
 * ensureFontAwesomeCss();
 * ```
 */
export function ensureFontAwesomeCss(): void {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(LINK_ID)) {
    return;
  }

  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href = FONT_AWESOME_CSS_HREF;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/**
 * 规范化图标名：去前缀，仅保留如 `xmark` / `mobile-screen`。
 *
 * @param raw - 原始输入（可含 `fa-` / `fa-solid`）
 * @returns 规范化名；非法时空串
 *
 * @example
 * ```ts
 * normalizeFaIconName("fa-solid fa-mobile"); // "mobile"
 * ```
 */
export function normalizeFaIconName(raw: unknown): string {
  if (typeof raw !== "string") {
    return "";
  }

  let name = raw.trim().toLowerCase();

  if (name.length === 0) {
    return "";
  }

  name = name
    .replace(/^fa-(solid|regular|brands|classic)\s+/g, "")
    .replace(/^fas\s+/g, "")
    .replace(/^far\s+/g, "")
    .replace(/^fab\s+/g, "");

  const parts = name.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const icon = last.replace(/^fa-/, "").replace(/[^a-z0-9-]/g, "");

  return icon;
}
