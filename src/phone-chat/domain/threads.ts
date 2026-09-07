/**
 * @file threads.ts
 * @description 会话线程追加与列表摘要。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { nextId } from "./id";
import {
  conversationIdForTarget,
  conversationIdForThread,
  directConversationId,
  targetFields,
  type ChatConversationTarget,
} from "./conversations";
import type {
  ChatMessage,
  ChatMessageDirection,
  ChatMessageStatus,
  ChatThread,
  MessageContentType,
} from "../types/index";

export interface AppendMessageInput {
  text: string;
  direction: ChatMessageDirection;
  status: ChatMessageStatus;
  contentType?: MessageContentType;
  imageAsset?: string;
  senderCharacterId?: string;
}

/** 向单聊或群聊追加消息。旧单聊 API 由 appendMessagesToThreads 包装。 */
export function appendMessagesToConversation(
  threads: readonly ChatThread[],
  target: ChatConversationTarget,
  incoming: readonly AppendMessageInput[],
  options: { bumpUnread: boolean },
): { threads: ChatThread[]; appended: ChatMessage[] } {
  const conversationId = conversationIdForTarget(target);
  if (!conversationId || incoming.length === 0) {
    return { threads: [...threads], appended: [] };
  }

  const now = Date.now();
  const appended: ChatMessage[] = incoming.map((item, index) => {
    const message: ChatMessage = {
      id: nextId("msg"),
      text: item.text,
      direction: item.direction,
      status: item.status,
      createdAt: now + index,
    };
    if (item.contentType !== undefined) message.contentType = item.contentType;
    if (item.imageAsset !== undefined) message.imageAsset = item.imageAsset;
    if (item.senderCharacterId?.trim()) {
      message.senderCharacterId = item.senderCharacterId.trim();
    }
    return message;
  });

  const unreadDelta = options.bumpUnread
    ? appended.filter((message) => message.direction === "incoming").length
    : 0;
  const index = threads.findIndex(
    (thread) => conversationIdForThread(thread) === conversationId,
  );
  if (index < 0) {
    const created: ChatThread = {
      ...targetFields(target),
      messages: appended,
      updatedAt: appended[appended.length - 1]?.createdAt ?? now,
      unreadCount: unreadDelta,
    };
    return { threads: [created, ...threads], appended };
  }

  const prev = threads[index]!;
  const nextThread: ChatThread = {
    ...prev,
    ...targetFields(target),
    messages: [...prev.messages, ...appended],
    updatedAt: appended[appended.length - 1]?.createdAt ?? now,
    unreadCount: Math.max(0, Number(prev.unreadCount) || 0) + unreadDelta,
  };
  const next = [...threads];
  next.splice(index, 1);
  return { threads: [nextThread, ...next], appended };
}

/**
 * 在线程列表中追加消息；若无线程则新建。
 *
 * @param threads - 当前全部线程
 * @param friendCharacterId - 好友角色 ID
 * @param incoming - 待追加消息（按顺序）
 * @param options.bumpUnread - 是否增加未读（对方消息且当前未打开该聊天时）
 * @returns 新线程列表与本次追加的消息
 */
export function appendMessagesToThreads(
  threads: readonly ChatThread[],
  friendCharacterId: string,
  incoming: readonly AppendMessageInput[],
  options: { bumpUnread: boolean },
): { threads: ChatThread[]; appended: ChatMessage[] } {
  const friendId = friendCharacterId.trim();
  return appendMessagesToConversation(
    threads,
    { kind: "direct", friendCharacterId: friendId },
    incoming,
    options,
  );
}

export function clearConversationUnread(
  threads: readonly ChatThread[],
  conversationId: string,
): ChatThread[] {
  const id = conversationId.trim();
  if (!id) return [...threads];
  return threads.map((thread) =>
    conversationIdForThread(thread) === id
      ? { ...thread, unreadCount: 0 }
      : thread,
  );
}

/**
 * 清空某会话未读数。
 *
 * @param threads - 线程列表
 * @param friendCharacterId - 好友 ID
 * @returns 更新后的线程列表
 */
export function clearThreadUnread(
  threads: readonly ChatThread[],
  friendCharacterId: string,
): ChatThread[] {
  return clearConversationUnread(
    threads,
    directConversationId(friendCharacterId),
  );
}

/**
 * 取会话最后一条文本摘要。
 *
 * @param thread - 会话
 * @param selfDisplayName - 我方显示名；空配置时为「我」
 * @returns 摘要；无消息时为空串
 */
export function threadPreviewText(
  thread: ChatThread | undefined,
  selfDisplayName = "我",
): string {
  if (!thread || thread.messages.length === 0) return "";
  const last = thread.messages[thread.messages.length - 1]!;
  const prefix = last.direction === "outgoing" ? `${selfDisplayName}: ` : "";
  if (last.contentType === "image") {
    return `${prefix}[图片]`.slice(0, 48);
  }
  const text = last.text.replace(/\s+/g, " ").trim();
  return `${prefix}${text}`.slice(0, 48);
}
