/**
 * @file ChatThreadRow.tsx
 * @description 会话列表单行（头像 / 名字 / 摘要 / 未读）。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React from "react";

import { threadPreviewText } from "../../domain/threads";
import type { ChatThread } from "../../types/index";
import { useCharacterView } from "../hooks/useCharacterView";
import { useSelfCharacterView } from "../hooks/useSelfCharacterView";
import { Avatar } from "./Avatar";

export interface ChatThreadRowProps {
  thread: ChatThread;
  onOpen: (friendCharacterId: string) => void;
}

/**
 * @param props - ChatThreadRowProps
 * @returns 可点击行
 */
export function ChatThreadRow(props: ChatThreadRowProps) {
  const ctx = useExtensionContext();
  const view = useCharacterView(ctx, props.thread.friendCharacterId);
  const selfView = useSelfCharacterView(ctx);
  const preview = threadPreviewText(props.thread, selfView.displayName);

  return (
    <button
      type="button"
      className="chat-row"
      onClick={() => props.onOpen(props.thread.friendCharacterId)}
    >
      <Avatar url={view.avatarUrl} glyph={view.glyph} />
      <div className="chat-row-main">
        <div className="chat-row-title">
          <span>{view.name}</span>
          {props.thread.unreadCount > 0 ? (
            <span className="chat-badge">
              {props.thread.unreadCount > 99
                ? "99+"
                : props.thread.unreadCount}
            </span>
          ) : null}
        </div>
        <div className="chat-row-sub">{preview || " "}</div>
      </div>
    </button>
  );
}
