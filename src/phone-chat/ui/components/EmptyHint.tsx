/**
 * @file EmptyHint.tsx
 * @description 空列表提示。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import React from "react";

/**
 * @param props.text - 提示文案
 * @returns 空状态节点
 */
export function EmptyHint(props: { text: string }) {
  return <div className="chat-empty">{props.text}</div>;
}
