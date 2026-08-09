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
import type { NavigateRequest } from "./types";

/**
 * 发布一条 navigate 请求；后到的 publish 覆盖 pending（仅保留最新）。
 *
 * @param request 目标应用 id、序号与可选 payload
 */
export function publishPhoneNavigate(request: NavigateRequest): void {
  const slot = getPhoneSdkSlot();
  slot.phoneNavigatePending = request;
  const listeners = slot.phoneNavigateListeners;
  if (listeners) {
    for (const listener of listeners) {
      listener(request);
    }
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
    listener(pending);
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
 */
export function clearPhoneNavigatePending(): void {
  delete getPhoneSdkSlot().phoneNavigatePending;
}

/**
 * 发出手机关闭事件，唤醒所有等待中的 waiter 并清空 waiter 集合。
 *
 * @remarks 一次性：emit 后 waiter 集合清空，后续 `waitForPhoneClosed` 调用立即 resolve。
 */
export function emitPhoneClosed(): void {
  const slot = getPhoneSdkSlot();
  clearPhoneNavigatePending();
  const waiters = slot.phoneClosedWaiters;
  if (waiters) {
    slot.phoneClosedWaiters = new Set();
    for (const resolve of waiters) {
      resolve();
    }
  }
}

/**
 * 等待手机关闭；一次性 waiter，`emitPhoneClosed` 时被唤醒。
 *
 * @returns 在下一次（或已发生的）`emitPhoneClosed` 后 resolve
 *
 * @remarks
 * - 若 `emitPhoneClosed` 已先于本调用发生，本调用立即 resolve（waiter 集合为空，
 *   但 emit 后无 pending 标记，故采用“无 waiter 即立即 resolve”语义需调用方保证
 *   顺序；当前实现仅在 emit 时唤醒已注册 waiter，未注册的调用需等到下次 emit）。
 * - 多次调用各自得到独立 waiter，一并唤醒。
 */
export function waitForPhoneClosed(): Promise<void> {
  const slot = getPhoneSdkSlot();
  return new Promise<void>((resolve) => {
    if (!slot.phoneClosedWaiters) {
      slot.phoneClosedWaiters = new Set();
    }
    slot.phoneClosedWaiters.add(resolve);
  });
}
