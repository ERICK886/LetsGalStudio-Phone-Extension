/**
 * @file EmptyHint.tsx
 * @description 空列表提示。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import React from "react";

export interface EmptyHintProps {
  /** 提示文案 */
  text: string;
}

/**
 * @param props - EmptyHintProps
 * @returns 空状态节点
 */
export function EmptyHint(props: EmptyHintProps) {
  return <div className="pa-empty">{props.text}</div>;
}
