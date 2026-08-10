/**
 * @file threads.ts
 * @description 会话线程追加与列表摘要。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { nextId } from "./id";
import type {
  ChatMessage,
  ChatMessageDirection,
  ChatMessageStatus,
  ChatThread,
} from "../types/index";

export interface AppendMessageInput {
  text: string;
  direction: ChatMessageDirection;
  status: ChatMessageStatus;
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
  if (!friendId || incoming.length === 0) {
    return { threads: [...threads], appended: [] };
  }

  const now = Date.now();
  const appended: ChatMessage[] = incoming.map((item) => ({
    id: nextId("msg"),
    text: item.text,
    direction: item.direction,
    status: item.status,
    createdAt: now,
  }));

  const unreadDelta = options.bumpUnread
    ? appended.filter((m) => m.direction === "incoming").length
    : 0;

  const index = threads.findIndex((t) => t.friendCharacterId === friendId);
  if (index < 0) {
    const created: ChatThread = {
      friendCharacterId: friendId,
      messages: appended,
      updatedAt: now,
      unreadCount: unreadDelta,
    };
    return { threads: [created, ...threads], appended };
  }

  const prev = threads[index]!;
  const nextThread: ChatThread = {
    ...prev,
    messages: [...prev.messages, ...appended],
    updatedAt: now,
    unreadCount: prev.unreadCount + unreadDelta,
  };
  const next = [...threads];
  next.splice(index, 1);
  return { threads: [nextThread, ...next], appended };
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
  const friendId = friendCharacterId.trim();
  return threads.map((thread) =>
    thread.friendCharacterId === friendId
      ? { ...thread, unreadCount: 0 }
      : thread,
  );
}

/**
 * 取会话最后一条文本摘要。
 *
 * @param thread - 会话
 * @returns 摘要；无消息时为空串
 */
export function threadPreviewText(thread: ChatThread | undefined): string {
  if (!thread || thread.messages.length === 0) return "";
  const last = thread.messages[thread.messages.length - 1]!;
  const prefix = last.direction === "outgoing" ? "我: " : "";
  const text = last.text.replace(/\s+/g, " ").trim();
  return `${prefix}${text}`.slice(0, 48);
}
