/**
 * @file register.ts
 * @description Phone SDK 注册/注销/查询 API；宿主未就绪时排队。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.2.0
 */

import { isPhoneAppId, toPhoneAppId } from "./app-id";
import { phoneSdkDebug } from "./debug";
import { getPhoneSdkSlot } from "./slot";
import type { PhoneAppRegistration } from "./types";

export { isPhoneAppId } from "./app-id";

/**
 * 规范化并校验一条注册描述。
 * `id` 会规约为 Studio 程序 ID（支持误填 `扩展ID/程序ID`）。
 *
 * @param app 原始注册对象
 * @returns 净化后的对象；非法时返回 `null` 并打警告
 */
function normalizeRegistration(app: PhoneAppRegistration): PhoneAppRegistration | null {
  if (!app || typeof app !== "object") {
    console.warn("[phone-sdk] registerPhoneApp: 参数无效");
    return null;
  }

  const normalizedId = typeof app.id === "string" ? toPhoneAppId(app.id) : null;
  if (!normalizedId || !isPhoneAppId(normalizedId)) {
    console.warn(
      "[phone-sdk] registerPhoneApp: id 须等于 Studio 程序 ID（@extension({ id })），"
        + "也可填写「扩展ID/程序ID」由 SDK 自动取程序段。示例：phone-snake 或 ink.zenly.ext-phone-snake/phone-snake",
      app.id,
    );
    return null;
  }

  if (typeof app.render !== "function") {
    console.warn("[phone-sdk] registerPhoneApp: render 必须是函数", normalizedId);
    return null;
  }

  const title = typeof app.title === "string" && app.title.trim()
    ? app.title.trim().slice(0, 64)
    : undefined;
  const description = typeof app.description === "string" && app.description.trim()
    ? app.description.trim().slice(0, 160)
    : undefined;

  return {
    id: normalizedId,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    render: app.render,
  };
}

/**
 * 向手机扩展注册一个可在手机内部显示的应用。
 *
 * @param app 应用描述（id + render 必填）；`id` 必须与本程序 `@extension({ id })` 一致
 * @returns void
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
  if (slot.host) {
    slot.host.unregisterApp(normalizedId);
    phoneSdkDebug("unregisterPhoneApp → 已从宿主移除", { id: normalizedId, hostReady: true });
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
}

/**
 * 查询当前宿主中已生效的应用；宿主未安装时返回 `undefined`。
 *
 * @param id 程序 ID，或 `扩展ID/程序ID`
 * @returns 注册对象或 `undefined`
 */
export function getRegisteredPhoneApp(id: string): PhoneAppRegistration | undefined {
  const normalizedId = toPhoneAppId(id);
  if (!normalizedId) return undefined;
  return getPhoneSdkSlot().host?.getApp(normalizedId);
}

/**
 * 列出宿主中全部已注册应用；宿主未安装时返回空数组。
 *
 * @returns 只读应用列表
 */
export function listRegisteredPhoneApps(): readonly PhoneAppRegistration[] {
  return getPhoneSdkSlot().host?.listApps() ?? [];
}
