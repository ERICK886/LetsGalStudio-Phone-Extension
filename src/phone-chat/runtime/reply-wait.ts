/**
 * @file reply-wait.ts
 * @description 单聊 / 群聊回复门闩：等待玩家点选回复或扩展卸载时安全解除。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { nextId } from "../domain/id";
import { directConversationId } from "../domain/conversations";
import { acquirePhoneCloseLock } from "@ink-zenly/phone-sdk/plugin";

interface WaitEntry {
  resolve: () => void;
  conversationId: string;
}

const waits = new Map<string, WaitEntry>();

/**
 * 注册一次等待；返回 token。
 *
 * @param conversationId - 统一会话键
 * @returns token 与 Promise
 */
export function createReplyWait(conversationId: string, signal?: AbortSignal): {
  token: string;
  promise: Promise<void>;
} {
  const token = nextId("wait");
  const releasePhoneCloseLock = acquirePhoneCloseLock();
  let resolvePromise: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    waits.delete(token);
    signal?.removeEventListener("abort", finish);
    releasePhoneCloseLock();
    resolvePromise();
  };
  waits.set(token, {
    resolve: finish,
    conversationId: conversationId.trim(),
  });
  if (signal?.aborted) finish();
  else signal?.addEventListener("abort", finish, { once: true });
  return { token, promise };
}

/**
 * 玩家点选回复后解除等待。
 *
 * @param token - createReplyWait 返回的 token
 */
export function resolveReplyWait(token: string | undefined): void {
  if (!token) return;
  const entry = waits.get(token);
  if (!entry) return;
  waits.delete(token);
  entry.resolve();
}

/**
 * 解除某会话相关的全部等待（扩展卸载 / 删除好友时防卡死）。
 *
 * @param conversationId - 统一会话键；空则解除全部
 */
export function resolveReplyWaitsForConversation(conversationId?: string): void {
  const target = conversationId?.trim();
  for (const [token, entry] of [...waits.entries()]) {
    if (!target || entry.conversationId === target) {
      waits.delete(token);
      entry.resolve();
    }
  }
}

/** 解除全部等待；保留旧导出名供卸载路径兼容。 */
export function resolveReplyWaitsForFriend(friendCharacterId?: string): void {
  resolveReplyWaitsForConversation(
    friendCharacterId ? directConversationId(friendCharacterId) : undefined,
  );
}
