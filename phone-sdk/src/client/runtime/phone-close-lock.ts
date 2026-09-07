/**
 * @file phone-close-lock.ts
 * @description 手机关闭锁：在必须完成的内页交互期间统一拦截关闭手机与返回桌面。
 */

import { getPhoneSdkSlot } from "./slot";

/** 返回当前是否存在任一手机关闭锁。 */
export function isPhoneCloseLocked(): boolean {
  const slot = getPhoneSdkSlot();
  return slot.phoneCloseLocked === true || (slot.phoneCloseLockTokens?.size ?? 0) > 0;
}

/** 订阅关闭锁变化；供手机宿主同步按钮的禁用状态。 */
export function subscribePhoneCloseLock(listener: () => void): () => void {
  const slot = getPhoneSdkSlot();
  const listeners = slot.phoneCloseLockListeners ?? new Set<() => void>();
  slot.phoneCloseLockListeners = listeners;
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 获取一枚关闭锁，并返回幂等释放函数。
 * 多个调用方并存时，最后一枚令牌释放后手机才恢复可关闭状态。
 */
export function acquirePhoneCloseLock(): () => void {
  const slot = getPhoneSdkSlot();
  const token = Symbol("phone-close-lock");
  const tokens = slot.phoneCloseLockTokens ?? new Set<symbol>();
  const wasLocked = isPhoneCloseLocked();

  slot.phoneCloseLockTokens = tokens;
  tokens.add(token);
  slot.phoneCloseLocked = true;
  if (!wasLocked) {
    for (const listener of slot.phoneCloseLockListeners ?? []) listener();
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const current = getPhoneSdkSlot();
    current.phoneCloseLockTokens?.delete(token);
    if ((current.phoneCloseLockTokens?.size ?? 0) > 0) return;

    delete current.phoneCloseLockTokens;
    current.phoneCloseLocked = false;
    for (const listener of current.phoneCloseLockListeners ?? []) listener();
  };
}
