/**
 * @file ReplyBar.tsx
 * @description 底部可选回复按钮组。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import React from "react";

export interface ReplyBarOption {
  id: string;
  text: string;
}

export interface ReplyBarProps {
  options: readonly ReplyBarOption[];
  onSelect: (replyId: string) => void;
}

/**
 * @param props - ReplyBarProps
 * @returns 回复栏；无选项时返回 null
 */
export function ReplyBar(props: ReplyBarProps) {
  if (props.options.length === 0) return null;

  return (
    <div className="chat-replies">
      {props.options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="chat-reply-btn"
          onClick={() => props.onSelect(option.id)}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
}
