/**
 * @file host.ts
 * @description Phone SDK 宿主安装入口；仅由手机扩展调用。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.1
 */

import { phoneSdkDebug } from "../debug/debug";
import { getPhoneSdkAppsRegistry, getPhoneSdkSlot } from "./slot";
import type { PhoneSdkHost } from "./types";

/**
 * 安装（或替换）Phone SDK 宿主，并刷入排队中的注册/注销。
 *
 * @param host 手机扩展提供的宿主实现
 * @returns 卸载函数；调用后清除槽位中的 host 引用（不清除已排队项）
 *
 * @example
 * ```ts
 * const dispose = installPhoneSdkHost(myHost);
 * // 扩展停用时：
 * dispose();
 * ```
 */
export function installPhoneSdkHost(host: PhoneSdkHost): () => void {
  const slot = getPhoneSdkSlot();
  if (slot.host && slot.host !== host) {
    console.warn("[phone-sdk] 正在替换已安装的 Phone SDK 宿主");
  }

  const queueIds = slot.queue.map((item) => item.id);
  phoneSdkDebug("installPhoneSdkHost：开始安装", {
    replacing: Boolean(slot.host && slot.host !== host),
    queueLength: slot.queue.length,
    queueIds,
    registrySizeBefore: getPhoneSdkAppsRegistry().size,
  });

  slot.host = host;

  const queued = slot.queue.splice(0, slot.queue.length);
  for (const app of queued) {
    host.registerApp(app);
  }

  const unregisters = slot.unregisterQueue.splice(0, slot.unregisterQueue.length);
  for (const id of unregisters) {
    host.unregisterApp(id);
  }

  phoneSdkDebug("installPhoneSdkHost：安装完成", {
    flushedRegisterCount: queued.length,
    flushedUnregisterCount: unregisters.length,
    registryIds: [...getPhoneSdkAppsRegistry().keys()],
  });

  return () => {
    const current = getPhoneSdkSlot();
    if (current.host === host) {
      current.host = undefined;
    }
    phoneSdkDebug("installPhoneSdkHost：宿主已卸载");
  };
}

/**
 * 读取当前已安装的宿主；未安装时返回 `undefined`。
 *
 * @returns 宿主或 `undefined`
 */
export function getPhoneSdkHost(): PhoneSdkHost | undefined {
  return getPhoneSdkSlot().host;
}
