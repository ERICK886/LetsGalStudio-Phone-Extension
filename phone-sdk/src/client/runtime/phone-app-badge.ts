/**
 * @file phone-app-badge.ts
 * @description 桌面 APP 角标（红点 / 数字）：仅内存，挂全局槽位供多 bundle 共享。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.5.4
 *
 * @example
 * ```ts
 * import { setPhoneAppBadge, clearPhoneAppBadge } from "@ink-zenly/phone-sdk/plugin";
 * setPhoneAppBadge("chat", { mode: "count", count: 3 });
 * clearPhoneAppBadge("chat");
 * ```
 */

import { toPhoneAppId } from "./app-id.ts";
import { getPhoneSdkSlot } from "./slot.ts";
import type { PhoneAppBadge } from "./types.ts";

/**
 * 将角标格式化为桌面展示文案。
 *
 * @param badge - 角标；`dot` 返回空串（由 UI 画点）
 * @returns `count` 模式为 `"1"…"99"` 或 `"99+"`；`dot` 为 `""`
 */
export function formatPhoneAppBadgeLabel(badge: PhoneAppBadge): string {
  if (badge.mode === "dot") return "";
  const n = badge.count;
  if (!Number.isFinite(n) || n < 1) return "";
  return n > 99 ? "99+" : String(Math.floor(n));
}

/**
 * 确保槽位上存在角标 Map 与监听集合。
 *
 * @returns badges Map
 */
function ensureBadgeMap(): Map<string, PhoneAppBadge> {
  const slot = getPhoneSdkSlot();
  if (!slot.phoneAppBadges) {
    slot.phoneAppBadges = new Map();
  }
  return slot.phoneAppBadges;
}

/**
 * 通知所有角标订阅者。
 *
 * @returns void
 */
function notifyBadgeListeners(): void {
  const listeners = getPhoneSdkSlot().phoneAppBadgeListeners;
  if (!listeners) return;
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error("[phone-sdk] phoneAppBadge listener error", error);
    }
  }
}

/**
 * 规范化 appId；非法返回 `null`。
 *
 * @param appId - 原始 id
 * @returns 规范化 id 或 `null`
 */
function normalizeAppId(appId: string): string | null {
  const id = toPhoneAppId(String(appId ?? "").trim());
  return id || null;
}

/**
 * 设置或覆盖桌面角标。
 *
 * @param appId - 与 `registerPhoneApp` / catalog `phoneAppId` 一致
 * @param badge - 角标；`null` 等同 clear。`count < 1` 或非有限数视为 clear
 * @returns void
 *
 * @remarks 非法 appId 打印 warn 并忽略。不要求已注册内页。
 */
export function setPhoneAppBadge(
  appId: string,
  badge: PhoneAppBadge | null,
): void {
  const id = normalizeAppId(appId);
  if (!id) {
    console.warn("[phone-sdk] setPhoneAppBadge: 非法 appId，已忽略", { appId });
    return;
  }

  const map = ensureBadgeMap();

  if (badge === null) {
    if (!map.delete(id)) return;
    notifyBadgeListeners();
    return;
  }

  if (badge.mode === "count") {
    const count = Number(badge.count);
    if (!Number.isFinite(count) || count < 1) {
      if (!map.delete(id)) return;
      notifyBadgeListeners();
      return;
    }
    map.set(id, { mode: "count", count: Math.floor(count) });
    notifyBadgeListeners();
    return;
  }

  if (badge.mode === "dot") {
    map.set(id, { mode: "dot" });
    notifyBadgeListeners();
    return;
  }

  console.warn("[phone-sdk] setPhoneAppBadge: 未知 badge.mode，已忽略", { badge });
}

/**
 * 清除指定 APP 的桌面角标。
 *
 * @param appId - 应用 id
 * @returns void
 */
export function clearPhoneAppBadge(appId: string): void {
  setPhoneAppBadge(appId, null);
}

/**
 * 读取指定 APP 当前角标。
 *
 * @param appId - 应用 id
 * @returns 角标；无则 `null`
 */
export function getPhoneAppBadge(appId: string): PhoneAppBadge | null {
  const id = normalizeAppId(appId);
  if (!id) return null;
  return ensureBadgeMap().get(id) ?? null;
}

/**
 * 当前全部角标的只读快照。
 *
 * @returns `ReadonlyMap` 副本
 */
export function getPhoneAppBadges(): ReadonlyMap<string, PhoneAppBadge> {
  return new Map(ensureBadgeMap());
}

/**
 * 订阅角标变更（任意 set / clear 后通知）。
 *
 * @param listener - 无参回调
 * @returns 取消订阅函数
 */
export function subscribePhoneAppBadges(listener: () => void): () => void {
  const slot = getPhoneSdkSlot();
  if (!slot.phoneAppBadgeListeners) {
    slot.phoneAppBadgeListeners = new Set();
  }
  slot.phoneAppBadgeListeners.add(listener);
  return () => {
    slot.phoneAppBadgeListeners?.delete(listener);
  };
}
