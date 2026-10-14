/**
 * @file phone-nav-bus.ts
 * @description 手机导航总线：navigate 请求发布/订阅 + 手机关闭一次性 waiters。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.5.0
 *
 * @remarks
 * 状态全部挂在全局槽位（`getPhoneSdkSlot()`），原因与 `apps` 表一致：
 * Studio 可能对同一 `dist/index.mjs` 做多次模块实例化，模块级变量会导致
 * publish 写实例 A、subscribe 读实例 B 而丢失 pending。
 */

import { getPhoneSdkSlot } from "./slot";
import { notifyListeners } from "./notify-listeners";
import type { NavigateRequest } from "./types";

/**
 * 发布一条 navigate 请求；后到的 publish 覆盖 pending（仅保留最新）。
 *
 * @param request 目标应用 id、序号与可选 payload
 */
export function publishPhoneNavigate(request: NavigateRequest, owner?: object): void {
  const slot = getPhoneSdkSlot();
  slot.phoneNavigatePending = request;
  slot.phoneNavigateOwner = owner;
  const listeners = slot.phoneNavigateListeners;
  if (listeners) {
    notifyListeners(listeners, request);
  }
}

/**
 * 订阅 navigate 请求。
 *
 * @param listener 收到 navigate 请求时的回调
 * @returns 取消订阅函数
 *
 * @remarks 订阅时若已有 pending，立即回放最新一条。
 */
export function subscribePhoneNavigate(
  listener: (req: NavigateRequest) => void,
): () => void {
  const slot = getPhoneSdkSlot();
  if (!slot.phoneNavigateListeners) {
    slot.phoneNavigateListeners = new Set();
  }
  slot.phoneNavigateListeners.add(listener);
  const pending = slot.phoneNavigatePending;
  if (pending) {
    notifyListeners([listener], pending);
  }
  return () => {
    slot.phoneNavigateListeners?.delete(listener);
  };
}

/**
 * 读取最近一条 pending navigate 请求。
 *
 * @returns 当前 pending；无发布过时为 `null`
 */
export function getLatestPhoneNavigate(): NavigateRequest | null {
  return getPhoneSdkSlot().phoneNavigatePending ?? null;
}

/**
 * 清除 pending navigate 请求；UI 消费后或手机关闭时调用，避免后续订阅回放 stale pending。
 * 传入序号时仅清除仍匹配的请求，防止较早的失败打开误删后来请求。
 */
export function clearPhoneNavigatePending(expectedSeq?: number): boolean {
  const slot = getPhoneSdkSlot();
  if (
    expectedSeq !== undefined &&
    slot.phoneNavigatePending?.seq !== expectedSeq
  ) {
    return false;
  }
  if (!slot.phoneNavigatePending) return false;
  delete slot.phoneNavigatePending;
  delete slot.phoneNavigateOwner;
  return true;
}

/**
 * 发出手机关闭事件，唤醒所有等待中的 waiter 并清空 waiter 集合。
 *
 * @remarks 只唤醒本次关闭之前注册的 waiter；后续调用等待下一次关闭。
 */
export function emitPhoneClosed(owner?: object): void {
  const slot = getPhoneSdkSlot();
  if (!owner || !slot.phoneNavigateOwner || slot.phoneNavigateOwner === owner) {
    clearPhoneNavigatePending();
  }
  const waiters = slot.phoneClosedWaiters;
  if (waiters) {
    const completing = [...waiters].filter((waiter) => {
      const waiterOwner = slot.phoneClosedWaiterOwners?.get(waiter);
      return !owner || !waiterOwner || waiterOwner === owner;
    });
    for (const waiter of completing) waiters.delete(waiter);
    notifyListeners(completing, undefined);
  }
}

/**
 * 等待手机关闭；一次性 waiter，`emitPhoneClosed` 时被唤醒。
 *
 * @returns 在下一次 `emitPhoneClosed` 或 signal abort 后 resolve
 *
 * @remarks
 * - 不重放历史关闭事件；调用方须先注册等待，再发起可能触发关闭的操作。
 * - 多次调用各自得到独立 waiter，一并唤醒。
 */
export function waitForPhoneClosed(signal?: AbortSignal, owner?: object): Promise<void> {
  const slot = getPhoneSdkSlot();
  return new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    if (!slot.phoneClosedWaiters) {
      slot.phoneClosedWaiters = new Set();
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      slot.phoneClosedWaiters?.delete(finish);
      slot.phoneClosedWaiterOwners?.delete(finish);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    slot.phoneClosedWaiters.add(finish);
    if (owner) {
      slot.phoneClosedWaiterOwners ??= new WeakMap();
      slot.phoneClosedWaiterOwners.set(finish, owner);
    }
    signal?.addEventListener("abort", finish, { once: true });
  });
}
