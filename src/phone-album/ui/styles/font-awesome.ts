/**
 * @file font-awesome.ts
 * @description 注入 Font Awesome 6 CDN 样式表（相册 Tab / 拍照图标）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import { FONT_AWESOME_CDN } from "../../constants";

const LINK_ID = "ink.zenly.ext-7a9373-phone-album-font-awesome";

/**
 * 确保 document 已加载 Font Awesome CDN。
 *
 * @returns void
 */
export function ensureFontAwesome(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(LINK_ID)) return;

  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href = FONT_AWESOME_CDN;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}
