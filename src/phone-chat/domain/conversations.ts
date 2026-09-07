/**
 * @file conversations.ts
 * @description 单聊 / 群聊统一会话键与旧存档兼容解析。
 */

import type { ChatPendingReplies, ChatThread } from "../types/index";

export const DIRECT_CONVERSATION_PREFIX = "direct:";
export const GROUP_CONVERSATION_PREFIX = "group:";

export type ChatConversationTarget =
  | { kind: "direct"; friendCharacterId: string }
  | { kind: "group"; groupId: string };

export function directConversationId(friendCharacterId: string): string {
  const id = friendCharacterId.trim();
  return id ? `${DIRECT_CONVERSATION_PREFIX}${id}` : "";
}

export function groupConversationId(groupId: string): string {
  const id = groupId.trim();
  return id ? `${GROUP_CONVERSATION_PREFIX}${id}` : "";
}

export function conversationIdForTarget(target: ChatConversationTarget): string {
  return target.kind === "group"
    ? groupConversationId(target.groupId)
    : directConversationId(target.friendCharacterId);
}

export function parseConversationId(
  conversationId: string,
): ChatConversationTarget | null {
  const value = conversationId.trim();
  if (value.startsWith(DIRECT_CONVERSATION_PREFIX)) {
    const friendCharacterId = value.slice(DIRECT_CONVERSATION_PREFIX.length).trim();
    return friendCharacterId ? { kind: "direct", friendCharacterId } : null;
  }
  if (value.startsWith(GROUP_CONVERSATION_PREFIX)) {
    const groupId = value.slice(GROUP_CONVERSATION_PREFIX.length).trim();
    return groupId ? { kind: "group", groupId } : null;
  }
  return null;
}

export function conversationIdForThread(thread: ChatThread): string {
  if (thread.kind === "group" || thread.groupId?.trim()) {
    return groupConversationId(thread.groupId ?? "");
  }
  return directConversationId(thread.friendCharacterId);
}

export function conversationIdForPending(pending: ChatPendingReplies): string {
  const explicit = pending.conversationId?.trim();
  if (explicit && parseConversationId(explicit)) return explicit;
  if (pending.groupId?.trim()) return groupConversationId(pending.groupId);
  return directConversationId(pending.friendCharacterId);
}

export function targetFields(target: ChatConversationTarget): Pick<
  ChatThread,
  "kind" | "friendCharacterId" | "groupId"
> {
  return target.kind === "group"
    ? { kind: "group", friendCharacterId: "", groupId: target.groupId.trim() }
    : { kind: "direct", friendCharacterId: target.friendCharacterId.trim() };
}
