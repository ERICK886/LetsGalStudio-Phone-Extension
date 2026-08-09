/**
 * @file AppHeader.tsx
 * @description 可复用顶栏：返回 / 标题 / 右侧占位。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * 与 chat 内页 AppHeader 同形，class 前缀 `pa-` 以避免冲突。
 */

import React from "react";

export interface AppHeaderProps {
  /** 标题文案 */
  title: string;
  /** 左侧返回；不传则只显示占位 */
  onBack?: () => void;
  /** 返回按钮文案 */
  backLabel?: string;
}

/**
 * @param props - AppHeaderProps
 * @returns 顶栏节点
 */
export function AppHeader(props: AppHeaderProps) {
  return (
    <header className="pa-header">
      {props.onBack ? (
        <button
          type="button"
          className="pa-back"
          onClick={props.onBack}
          aria-label={props.backLabel ?? "返回"}
        >
          {props.backLabel ?? "返回"}
        </button>
      ) : (
        <span className="pa-header-spacer" />
      )}
      <h1>{props.title}</h1>
      <span className="pa-header-spacer" />
    </header>
  );
}
