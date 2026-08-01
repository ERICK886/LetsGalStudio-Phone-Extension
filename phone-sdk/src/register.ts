/**
 * @file register.ts
 * @description Phone SDK 注册/注销/查询 API；宿主未就绪时排队。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { phoneSdkDebug } from "./debug";
import { getPhoneSdkSlot } from "./slot";
import type { PhoneAppRegistration } from "./types";


const SAFE_APP_ID =
  /^[a-z0-9](?:[a-z0-9-]{0,62}|[a-z0-9.-]{0,126}[a-z0-9])$/;

/**
 * 校验 Phone SDK 应用 id。
 *
 * 支持两种约定：
 * 1. 短 kebab-case：`shop`、`snake-demo`
 * 2. 与 `extension.json` 的 `id` 一致的 reverse-DNS：`ink.zenly.ext-phone-snake`
 *
 * @param id 待校验字符串
 * @returns 是否合法
 */
export function isPhoneAppId(id: unknown): id is string {
  return typeof id === "string" && id.length <= 128 && SAFE_APP_ID.test(id);
}

/**
 * 规范化并校验一条注册描述。
 *
 * @param app 原始注册对象
 * @returns 净化后的对象；非法时返回 `null` 并打警告
 */
function normalizeRegistration(app: PhoneAppRegistration): PhoneAppRegistration | null {
  if (!app || typeof app !== "object") {
    console.warn("[phone-sdk] registerPhoneApp: 参数无效");
    return null;
  }
  if (!isPhoneAppId(app.id)) {
    console.warn(
      "[phone-sdk] registerPhoneApp: id 须为 kebab-case 或与 extension.json 的 id 一致（小写字母/数字/点/连字符）",
      app.id,
    );
    return null;
  }
  if (typeof app.render !== "function") {
    console.warn("[phone-sdk] registerPhoneApp: render 必须是函数", app.id);
    return null;
  }

  const title = typeof app.title === "string" && app.title.trim()
    ? app.title.trim().slice(0, 64)
    : undefined;
  const description = typeof app.description === "string" && app.description.trim()
    ? app.description.trim().slice(0, 160)
    : undefined;

  return {
    id: app.id,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    render: app.render,
  };
}

/**
 * 向手机扩展注册一个可在手机内部显示的应用。
 *
 * @param app 应用描述（id + render 必填）
 * @returns void
 * @throws 不抛出；非法参数只警告并忽略
 *
 * @example
 * ```ts
 * import { registerPhoneApp } from "@ink-zenly/phone-sdk";
 *
 * registerPhoneApp({
 *   id: "shop",
 *   title: "商店",
 *   render: ({ closeApp }) => <button type="button" onClick={closeApp}>回桌面</button>,
 * });
 * ```
 */
export function registerPhoneApp(app: PhoneAppRegistration): void {
  const normalized = normalizeRegistration(app);
  if (!normalized) return;

  const slot = getPhoneSdkSlot();
  if (slot.host) {
    slot.host.registerApp(normalized);
    phoneSdkDebug("registerPhoneApp → 已写入宿主", {
      id: normalized.id,
      title: normalized.title,
      hostReady: true,
      queued: false,
    });
    return;
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
}

/**
 * 注销此前注册的手机内部应用。
 *
 * @param id 应用 id
 * @returns void
 */
export function unregisterPhoneApp(id: string): void {
  if (!isPhoneAppId(id)) {
    console.warn("[phone-sdk] unregisterPhoneApp: id 无效", id);
    return;
  }

  const slot = getPhoneSdkSlot();
  if (slot.host) {
    slot.host.unregisterApp(id);
    phoneSdkDebug("unregisterPhoneApp → 已从宿主移除", { id, hostReady: true });
    return;
  }

  slot.queue = slot.queue.filter((item) => item.id !== id);
  if (!slot.unregisterQueue.includes(id)) {
    slot.unregisterQueue.push(id);
  }
  phoneSdkDebug("unregisterPhoneApp → 宿主未就绪，已记入注销队列", {
    id,
    hostReady: false,
    unregisterQueueLength: slot.unregisterQueue.length,
  });
}

/**
 * 查询当前宿主中已生效的应用；宿主未安装时返回 `undefined`。
 *
 * @param id 应用 id
 * @returns 注册对象或 `undefined`
 */
export function getRegisteredPhoneApp(id: string): PhoneAppRegistration | undefined {
  if (!isPhoneAppId(id)) return undefined;
  return getPhoneSdkSlot().host?.getApp(id);
}

/**
 * 列出宿主中全部已注册应用；宿主未安装时返回空数组。
 *
 * @returns 只读应用列表
 */
export function listRegisteredPhoneApps(): readonly PhoneAppRegistration[] {
  return getPhoneSdkSlot().host?.listApps() ?? [];
}
