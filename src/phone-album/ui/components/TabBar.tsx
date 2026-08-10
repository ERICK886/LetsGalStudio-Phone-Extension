/**
 * @file TabBar.tsx
 * @description 相册内页底部 Tab：相册 / 拍照（Font Awesome 图标）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import React from "react";

import type { AlbumMainTab } from "../../runtime/camera-session";

export interface TabBarProps {
  /** 当前主 Tab */
  active: AlbumMainTab;
  /** 切换 Tab */
  onChange: (tab: AlbumMainTab) => void;
}

/**
 * @param props - TabBarProps
 * @returns 底部 TabBar
 */
export function TabBar(props: TabBarProps) {
  const { active, onChange } = props;

  return (
    <nav className="pa-tabbar" aria-label="相册导航">
      <button
        type="button"
        className={`pa-tab${active === "album" ? " is-active" : ""}`}
        onClick={() => onChange("album")}
        aria-current={active === "album" ? "page" : undefined}
      >
        <i className="fa-solid fa-images" aria-hidden="true" />
        <span>相册</span>
      </button>
      <button
        type="button"
        className={`pa-tab${active === "camera" ? " is-active" : ""}`}
        onClick={() => onChange("camera")}
        aria-current={active === "camera" ? "page" : undefined}
      >
        <i className="fa-solid fa-camera" aria-hidden="true" />
        <span>拍照</span>
      </button>
    </nav>
  );
}
