/**
 * @file bus.ts
 * @description 会话变更总线：方法写入后通知内页做追加动画 / 刷新列表。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import type { ChatMessage, ChatSaveState } from "../types/index";

export type ChatBusEvent =
  | {
      type: "messages-appended";
      friendCharacterId: string;
      messages: readonly ChatMessage[];
    }
  | { type: "state-changed"; reason: string }
  | {
      type: "replies-changed";
      friendCharacterId: string | null;
    };

type Listener = (event: ChatBusEvent) => void;

const listeners = new Set<Listener>();

/** 当前 UI 打开的聊天好友（用于判断是否 bump 未读 / 播动画）。 */
let openChatFriendId: string | null = null;

/**
 * 订阅总线事件。
 *
 * @param listener - 回调
 * @returns 取消订阅函数
 */
export function subscribeChatBus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 发布事件。
 *
 * @param event - 事件
 */
export function emitChatBus(event: ChatBusEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("[chat] bus listener error", error);
    }
  }
}

/**
 * 记录 UI 当前打开的聊天（无则 null）。
 *
 * @param friendCharacterId - 好友 ID 或 null
 */
export function setOpenChatFriendId(friendCharacterId: string | null): void {
  openChatFriendId = friendCharacterId?.trim() || null;
}

/**
 * @returns 当前打开的聊天好友 ID
 */
export function getOpenChatFriendId(): string | null {
  return openChatFriendId;
}

/**
 * 是否正在查看指定好友聊天页。
 *
 * @param friendCharacterId - 好友 ID
 */
export function isViewingChat(friendCharacterId: string): boolean {
  return openChatFriendId === friendCharacterId.trim();
}

/** 供类型导出，避免未使用告警。 */
export type ChatBusStateSnapshot = ChatSaveState;
