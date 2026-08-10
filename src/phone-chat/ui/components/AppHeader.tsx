/**
 * @file AppHeader.tsx
 * @description 可复用顶栏：返回 / 标题 / 右侧占位。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
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
    <header className="chat-header">
      {props.onBack ? (
        <button type="button" className="chat-back" onClick={props.onBack}>
          {props.backLabel ?? "返回"}
        </button>
      ) : (
        <span className="chat-header-spacer" />
      )}
      <h1>{props.title}</h1>
      <span className="chat-header-spacer" />
    </header>
  );
}
