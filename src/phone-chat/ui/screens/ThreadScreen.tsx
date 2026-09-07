/**
 * @file ThreadScreen.tsx
 * @description 单聊 / 群聊会话页：气泡列表 + 可选回复。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import React from "react";

import type { ChatReplyOption, ChatThread } from "../../types/index";
import {
  AppHeader,
  MessageBubble,
  ReplyBar,
} from "../components/index";

export interface ThreadScreenProps {
  title: string;
  friendCharacterId?: string;
  isGroup?: boolean;
  memberCount?: number;
  thread: ChatThread | undefined;
  animatingIds: Set<string>;
  replyOptions: readonly ChatReplyOption[];
  logRef: React.RefObject<HTMLDivElement>;
  onBack: () => void;
  onSelectReply: (replyId: string) => void;
}

/**
 * @param props - ThreadScreenProps
 * @returns 聊天页节点
 */
export function ThreadScreen(props: ThreadScreenProps) {
  const messages = props.thread?.messages ?? [];
  const title =
    props.isGroup && props.memberCount
      ? `${props.title} (${props.memberCount})`
      : props.title;

  return (
    <div className="chat-pane">
      <AppHeader title={title} onBack={props.onBack} />

      <div className="chat-log" ref={props.logRef}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            peerCharacterId={props.friendCharacterId}
            showSenderName={props.isGroup}
            animate={props.animatingIds.has(message.id)}
          />
        ))}
      </div>

      <ReplyBar
        options={props.replyOptions}
        onSelect={props.onSelectReply}
      />
    </div>
  );
}
