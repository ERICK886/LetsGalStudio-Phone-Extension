/**
 * @file MessageBubble.tsx
 * @description 单条气泡（对方 / 我方 + 状态）。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React from "react";

import type { ChatMessage } from "../../types/index";
import { useCharacterView } from "../hooks/useCharacterView";
import { Avatar } from "./Avatar";
import { StatusLabel } from "./StatusLabel";

export interface MessageBubbleProps {
  message: ChatMessage;
  friendCharacterId: string;
  /** 是否播放入场动画 */
  animate?: boolean;
}

/**
 * @param props - MessageBubbleProps
 * @returns 气泡节点
 */
export function MessageBubble(props: MessageBubbleProps) {
  const ctx = useExtensionContext();
  const friendView = useCharacterView(ctx, props.friendCharacterId);
  const isOutgoing = props.message.direction === "outgoing";
  const glyph = isOutgoing ? "我" : friendView.glyph;
  const url = isOutgoing ? undefined : friendView.avatarUrl;

  return (
    <div
      className="chat-msg"
      data-direction={props.message.direction}
      data-animate={props.animate ? "true" : "false"}
    >
      <Avatar url={url} glyph={glyph} />
      <div className="chat-msg-col">
        <div className="chat-bubble">{props.message.text}</div>
        {isOutgoing ? <StatusLabel status={props.message.status} /> : null}
      </div>
    </div>
  );
}
