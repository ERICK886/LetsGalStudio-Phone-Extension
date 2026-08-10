/**
 * @file reply-wait.ts
 * @description await-player-reply 门闩：等待玩家点选回复或安全解除。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { nextId } from "../domain/id";

interface WaitEntry {
  resolve: () => void;
  friendCharacterId: string;
}

const waits = new Map<string, WaitEntry>();

/**
 * 注册一次等待；返回 token。
 *
 * @param friendCharacterId - 好友 ID
 * @returns token 与 Promise
 */
export function createReplyWait(friendCharacterId: string): {
  token: string;
  promise: Promise<void>;
} {
  const token = nextId("wait");
  let resolveFn: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    resolveFn = resolve;
  });
  waits.set(token, {
    resolve: resolveFn,
    friendCharacterId: friendCharacterId.trim(),
  });
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
 * 解除某好友相关的全部等待（卸载 / 覆盖回复时防卡死）。
 *
 * @param friendCharacterId - 好友 ID；空则解除全部
 */
export function resolveReplyWaitsForFriend(friendCharacterId?: string): void {
  const target = friendCharacterId?.trim();
  for (const [token, entry] of [...waits.entries()]) {
    if (!target || entry.friendCharacterId === target) {
      waits.delete(token);
      entry.resolve();
    }
  }
}
