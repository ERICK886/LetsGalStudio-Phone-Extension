/**
 * @file TabIcons.tsx
 * @description 首页 TabBar 线框图标（聊天气泡 / 好友人形）。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import React from "react";

/**
 * 共享 SVG 属性：24×24 线框，颜色继承 currentColor。
 */
const ICON_PROPS = {
  className: "chat-tab-icon",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true as const,
  focusable: false as const,
};

/**
 * 聊天 Tab 图标：双气泡线框轮廓。
 *
 * @returns SVG 节点
 *
 * @example
 * ```tsx
 * <TabIconChat />
 * ```
 */
export function TabIconChat() {
  return (
    <svg {...ICON_PROPS}>
      <path
        d="M4.5 6.75c0-1.24 1.01-2.25 2.25-2.25h7.5c1.24 0 2.25 1.01 2.25 2.25v5.25c0 1.24-1.01 2.25-2.25 2.25H9.2L6.3 17.1a.4.4 0 0 1-.67-.3v-2.55H6.75c-1.24 0-2.25-1.01-2.25-2.25V6.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14.25 10.5h3c1.24 0 2.25 1.01 2.25 2.25v3.75c0 1.24-1.01 2.25-2.25 2.25h-.45v1.8a.35.35 0 0 1-.58.26l-2.22-1.85H12c-1.05 0-1.93-.72-2.18-1.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 好友 Tab 图标：圆形头 + 肩线人形。
 *
 * @returns SVG 节点
 *
 * @example
 * ```tsx
 * <TabIconFriends />
 * ```
 */
export function TabIconFriends() {
  return (
    <svg {...ICON_PROPS}>
      <circle
        cx="12"
        cy="8"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5.5 18.5c.7-3.1 3-4.75 6.5-4.75s5.8 1.65 6.5 4.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
