/**
 * @file register.ts
 * @description Phone SDK 注册/注销/查询 API；宿主未就绪时排队。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.2.0
 */

import { toPhoneAppId, parseStudioProgramRef } from "./app-id";
import { phoneSdkDebug } from "../debug/debug";
import { getPhoneSdkSlot } from "./slot";
import { parsePhoneAppRegistration } from "./parse-registration";
import { resolvePhoneAppReference } from "./resolve-app";
import type { PhoneAppRegistration } from "./types";

export { isPhoneAppId } from "./app-id";

/**
 * 向手机扩展注册一个可在手机内部显示的应用。
 *
 * @param app 应用描述（id + render 必填）；`id` 必须与本程序 `@extension({ id })` 一致
 * @returns 仅注销本次注册的幂等清理函数；旧实例不会清除新注册
 * @throws 不抛出；非法参数只警告并忽略
 *
 * @example
 * ```ts
 * const PROGRAM_ID = "phone-snake";
 *
 * @extension({ id: PROGRAM_ID, label: "贪吃蛇", exposeUI: false })
 * class PhoneSnakeExtension extends Extension {
 *   static onRegister() {
 *     registerPhoneApp({
 *       id: PROGRAM_ID,
 *       render: (props) => <SnakeApp {...props} />,
 *     });
 *   }
 * }
 * ```
 */
export function registerPhoneApp(app: PhoneAppRegistration): () => void {
  const slot = getPhoneSdkSlot();
  const input = app && typeof app === "object" && !app.extensionId && slot.registrationContext
    ? { ...app, extensionId: slot.registrationContext.extensionId } : app;
  const parsed = parsePhoneAppRegistration(input);
  const normalized = parsed.app;
  if (!normalized) {
    console.warn("[phone-sdk] 注册描述无效", parsed.issues);
    return () => undefined;
  }
  const existing = slot.host?.getApp(normalized.id) ?? slot.queue.find((item) => item.id === normalized.id) ?? slot.apps?.get(normalized.id);
  if (existing?.extensionId && normalized.extensionId !== existing.extensionId) {
    console.warn("[phone-sdk] 程序 ID 已被其他扩展占用，已保留原应用", {
      id: normalized.id, owner: existing.extensionId, rejectedOwner: normalized.extensionId,
    });
    return () => undefined;
  }
  slot.registrationTokens ??= new Map();
  const token = {};
  slot.registrationTokens.set(normalized.id, token);
  const dispose = () => {
    if (slot.registrationTokens?.get(normalized.id) !== token) return;
    unregisterPhoneApp(normalized.extensionId ? `${normalized.extensionId}/${normalized.id}` : normalized.id);
  };
  slot.registrationContext?.disposers.push(dispose);
  slot.unregisterQueue = slot.unregisterQueue.filter((id) => id !== normalized.id);
  if (slot.host) {
    slot.host.registerApp(normalized);
    phoneSdkDebug("registerPhoneApp → 已写入宿主", {
      id: normalized.id,
      title: normalized.title,
      hostReady: true,
      queued: false,
    });
    notifyPhoneAppRegistryChanged();
    return dispose;
  }

  const index = slot.queue.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    console.warn("[phone-sdk] 宿主未就绪，队列中同 id 注册将被覆盖", normalized.id);
    slot.queue[index] = normalized;
  } else {
    slot.queue.push(normalized);
  }
  phoneSdkDebug("registerPhoneApp → 宿主未就绪，已入队", {
    id: normalized.id,
    title: normalized.title,
    hostReady: false,
    queueLength: slot.queue.length,
  });
  notifyPhoneAppRegistryChanged();
  return dispose;
}

/**
 * 注销此前注册的手机内部应用。
 *
 * @param id 程序 ID，或 `扩展ID/程序ID`（自动取程序段）
 * @returns void
 */
export function unregisterPhoneApp(id: string): void {
  const normalizedId = toPhoneAppId(id);
  if (!normalizedId) {
    console.warn("[phone-sdk] unregisterPhoneApp: id 无效", id);
    return;
  }

  const slot = getPhoneSdkSlot();
  const reference = parseStudioProgramRef(id)!;
  const current = slot.host?.getApp(normalizedId) ?? slot.queue.find((item) => item.id === normalizedId) ?? slot.apps?.get(normalizedId);
  if (reference.extensionId && current?.extensionId && reference.extensionId !== current.extensionId) return;
  slot.registrationTokens?.delete(normalizedId);
  if (slot.host) {
    slot.host.unregisterApp(normalizedId);
    phoneSdkDebug("unregisterPhoneApp → 已从宿主移除", { id: normalizedId, hostReady: true });
    notifyPhoneAppRegistryChanged();
    return;
  }

  slot.queue = slot.queue.filter((item) => item.id !== normalizedId);
  if (!slot.unregisterQueue.includes(normalizedId)) {
    slot.unregisterQueue.push(normalizedId);
  }
  phoneSdkDebug("unregisterPhoneApp → 宿主未就绪，已记入注销队列", {
    id: normalizedId,
    hostReady: false,
    unregisterQueueLength: slot.unregisterQueue.length,
  });
  notifyPhoneAppRegistryChanged();
}

/**
 * 查询当前宿主中已生效的应用；宿主未安装时返回 `undefined`。
 *
 * @param id 程序 ID，或 `扩展ID/程序ID`
 * @returns 注册对象或 `undefined`
 */
export function getRegisteredPhoneApp(id: string): PhoneAppRegistration | undefined {
  const host = getPhoneSdkSlot().host;
  return host ? resolvePhoneAppReference(id, host.listApps()).app : undefined;
}

/**
 * 列出已注册（或宿主未就绪时队列中）的全部内页应用。
 *
 * @returns 只读应用列表
 */
export function listRegisteredPhoneApps(): readonly PhoneAppRegistration[] {
  const slot = getPhoneSdkSlot();
  if (slot.host) {
    return slot.host.listApps();
  }
  return [...slot.queue];
}

/**
 * 订阅内页注册表变更（register / unregister）。
 *
 * @param listener - 无参回调
 * @returns 取消订阅函数
 *
 * @example
 * ```ts
 * const off = subscribePhoneAppRegistry(() => forceUpdate());
 * ```
 */
export function subscribePhoneAppRegistry(listener: () => void): () => void {
  const slot = getPhoneSdkSlot();
  if (!slot.phoneAppRegistryListeners) {
    slot.phoneAppRegistryListeners = new Set();
  }
  slot.phoneAppRegistryListeners.add(listener);
  return () => {
    slot.phoneAppRegistryListeners?.delete(listener);
  };
}

/**
 * 通知注册表订阅者（宿主 register/unregister 后调用）。
 *
 * @returns void
 */
export function notifyPhoneAppRegistryChanged(): void {
  const listeners = getPhoneSdkSlot().phoneAppRegistryListeners;
  if (!listeners || listeners.size === 0) return;
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      console.warn("[phone-sdk] phoneAppRegistry listener 失败", error);
    }
  }
}
