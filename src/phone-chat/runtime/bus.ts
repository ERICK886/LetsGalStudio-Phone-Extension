/**
 * @file bus.ts
 * @description 会话变更总线：方法写入后通知内页做追加动画 / 刷新列表。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { getChatScopedState } from "./runtime-scope";


import type { ChatMessage, ChatSaveState } from "../types/index";

export type ChatBusEvent =
  | {
      type: "messages-appended";
      conversationId: string;
      messages: readonly ChatMessage[];
    }
  | { type: "state-changed"; reason: string }
  | {
      type: "replies-changed";
      conversationId: string | null;
    };

type Listener = (event: ChatBusEvent) => void;

function runtimeFor(runtimeKey?: object): { listeners: Set<Listener>; openConversationId: string | null } {
  return getChatScopedState("bus", runtimeKey, () => ({ listeners: new Set<Listener>(), openConversationId: null }));
}

/**
 * 订阅总线事件。
 *
 * @param listener - 回调
 * @returns 取消订阅函数
 */
export function subscribeChatBus(listener: Listener, runtimeKey?: object): () => void {
  const { listeners } = runtimeFor(runtimeKey);
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
export function emitChatBus(event: ChatBusEvent, runtimeKey?: object): void {
  const { listeners } = runtimeFor(runtimeKey);
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
export function setOpenConversationId(conversationId: string | null, runtimeKey?: object): void {
  runtimeFor(runtimeKey).openConversationId = conversationId?.trim() || null;
}

/**
 * @returns 当前打开的聊天好友 ID
 */
export function getOpenConversationId(runtimeKey?: object): string | null {
  return runtimeFor(runtimeKey).openConversationId;
}

/**
 * 是否正在查看指定好友聊天页。
 *
 * @param friendCharacterId - 好友 ID
 */
export function isViewingConversation(conversationId: string, runtimeKey?: object): boolean {
  return runtimeFor(runtimeKey).openConversationId === conversationId.trim();
}

/** 供类型导出，避免未使用告警。 */
export type ChatBusStateSnapshot = ChatSaveState;
