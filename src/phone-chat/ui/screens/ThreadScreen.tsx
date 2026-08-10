/**
 * @file ThreadScreen.tsx
 * @description 与某好友的聊天页：气泡列表 + 可选回复。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React from "react";

import type { ChatReplyOption, ChatThread } from "../../types/index";
import {
  AppHeader,
  MessageBubble,
  ReplyBar,
} from "../components/index";
import { useCharacterView } from "../hooks/useCharacterView";

export interface ThreadScreenProps {
  friendCharacterId: string;
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
  const ctx = useExtensionContext();
  const view = useCharacterView(ctx, props.friendCharacterId);
  const messages = props.thread?.messages ?? [];

  return (
    <div className="chat-pane">
      <AppHeader title={view.name} onBack={props.onBack} />

      <div className="chat-log" ref={props.logRef}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            friendCharacterId={props.friendCharacterId}
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
