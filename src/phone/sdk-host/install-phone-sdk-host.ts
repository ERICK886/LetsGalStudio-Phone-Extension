/**
 * @file install-phone-sdk-host.ts
 * @description 在手机扩展内安装 @ink-zenly/phone-sdk 宿主，维护已注册应用表。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.2.0
 */

import {
  installPhoneSdkHost,
  toPhoneAppId,
  type PhoneAppRegistration,
  type PhoneSdkHost,
} from "@ink-zenly/phone-sdk";

/** 模块级注册表；与 globalThis 槽位中的 host 方法绑定。key = Studio 程序 ID。 */
const registeredApps = new Map<string, PhoneAppRegistration>();

/**
 * 创建并安装 Phone SDK 宿主。
 *
 * @returns 卸载函数；调用后清空注册表并解除宿主挂载
 *
 * @example
 * ```ts
 * static onRegister() {
 *   const dispose = installPhoneExtensionSdkHost();
 *   // 若将来有 onUnregister：dispose();
 * }
 * ```
 */
export function installPhoneExtensionSdkHost(): () => void {
  const host: PhoneSdkHost = {
    registerApp(app) {
      if (registeredApps.has(app.id)) {
        console.warn("[phone] Phone SDK 同 id 应用将被覆盖", app.id);
      }
      registeredApps.set(app.id, app);
    },
    unregisterApp(id) {
      const key = toPhoneAppId(id) ?? id;
      registeredApps.delete(key);
    },
    getApp(id) {
      const key = toPhoneAppId(id) ?? id;
      return registeredApps.get(key);
    },
    listApps() {
      return [...registeredApps.values()];
    },
  };

  return installPhoneSdkHost(host);
}

/**
 * 供手机 UI 查询已注册应用（不经过重新 import 客户端队列）。
 *
 * @param id 程序 ID，或 Studio 引用 `扩展ID/程序ID`
 * @returns 注册对象或 `undefined`
 */
export function lookupPhoneSdkApp(id: string): PhoneAppRegistration | undefined {
  const key = toPhoneAppId(id);
  if (!key) return undefined;
  return registeredApps.get(key);
}
