/**
 * @file ChatThreadRow.tsx
 * @description 单聊 / 群聊会话列表行。
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React from "react";

import { resolveAssetUrl } from "../../domain/character";
import {
  conversationIdForThread,
  parseConversationId,
} from "../../domain/conversations";
import { findGroupDefinition } from "../../domain/groups";
import { threadPreviewText } from "../../domain/threads";
import type { ChatGroupDefinition, ChatThread } from "../../types/index";
import { useCharacterView } from "../hooks/useCharacterView";
import { useSelfCharacterView } from "../hooks/useSelfCharacterView";
import { Avatar } from "./Avatar";

export interface ChatThreadRowProps {
  thread: ChatThread;
  groups: readonly ChatGroupDefinition[];
  onOpen: (conversationId: string) => void;
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="chat-badge">{count > 99 ? "99+" : count}</span>;
}

function DirectThreadRow(props: ChatThreadRowProps & { friendCharacterId: string }) {
  const ctx = useExtensionContext();
  const view = useCharacterView(ctx, props.friendCharacterId);
  const selfView = useSelfCharacterView(ctx);
  const conversationId = conversationIdForThread(props.thread);
  return (
    <button type="button" className="chat-row" onClick={() => props.onOpen(conversationId)}>
      <Avatar url={view.avatarUrl} glyph={view.glyph} />
      <div className="chat-row-main">
        <div className="chat-row-title">
          <span>{view.name}</span>
          <UnreadBadge count={props.thread.unreadCount} />
        </div>
        <div className="chat-row-sub">
          {threadPreviewText(props.thread, selfView.displayName) || " "}
        </div>
      </div>
    </button>
  );
}

function IncomingGroupPreview(props: {
  senderCharacterId: string;
  preview: string;
}) {
  const ctx = useExtensionContext();
  const sender = useCharacterView(ctx, props.senderCharacterId);
  return <>{`${sender.name}: ${props.preview}`}</>;
}

function GroupThreadRow(props: ChatThreadRowProps & { groupId: string }) {
  const ctx = useExtensionContext();
  const selfView = useSelfCharacterView(ctx);
  const group = findGroupDefinition(props.groups, props.groupId);
  const title = group?.title || props.groupId;
  const avatarUrl = resolveAssetUrl(ctx, group?.avatarAsset);
  const conversationId = conversationIdForThread(props.thread);
  const preview = threadPreviewText(props.thread, selfView.displayName);
  const last = props.thread.messages[props.thread.messages.length - 1];

  return (
    <button type="button" className="chat-row" onClick={() => props.onOpen(conversationId)}>
      <Avatar url={avatarUrl} glyph={title.trim().slice(0, 1) || "群"} />
      <div className="chat-row-main">
        <div className="chat-row-title">
          <span>{title}</span>
          <UnreadBadge count={props.thread.unreadCount} />
        </div>
        <div className="chat-row-sub">
          {last?.direction === "incoming" && last.senderCharacterId ? (
            <IncomingGroupPreview
              senderCharacterId={last.senderCharacterId}
              preview={preview}
            />
          ) : (
            preview || " "
          )}
        </div>
      </div>
    </button>
  );
}

export function ChatThreadRow(props: ChatThreadRowProps) {
  const target = parseConversationId(conversationIdForThread(props.thread));
  if (!target) return null;
  return target.kind === "group" ? (
    <GroupThreadRow {...props} groupId={target.groupId} />
  ) : (
    <DirectThreadRow {...props} friendCharacterId={target.friendCharacterId} />
  );
}
