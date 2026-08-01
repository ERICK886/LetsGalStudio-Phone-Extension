/**
 * @file slot.ts
 * @description Phone SDK 全局槽位读写；保证多 bundle 共享同一注册队列与宿主。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import type { PhoneSdkGlobalSlot } from "./types";

/** 固定命名空间；第三方与手机扩展必须使用同一键。 */
export const PHONE_SDK_GLOBAL_KEY = "__LetsGalPhoneSdk__" as const;

type GlobalWithPhoneSdk = typeof globalThis & {
  [PHONE_SDK_GLOBAL_KEY]?: PhoneSdkGlobalSlot;
};

/**
 * 取得（必要时创建）全局 Phone SDK 槽位。
 *
 * @returns 可变的全局槽位对象
 * @remarks 幂等；可在任意扩展的 `onRegister` 中安全调用。
 */
export function getPhoneSdkSlot(): PhoneSdkGlobalSlot {
  const root = globalThis as GlobalWithPhoneSdk;
  const existing = root[PHONE_SDK_GLOBAL_KEY];
  if (existing) return existing;

  const created: PhoneSdkGlobalSlot = {
    queue: [],
    unregisterQueue: [],
  };
  root[PHONE_SDK_GLOBAL_KEY] = created;
  return created;
}
