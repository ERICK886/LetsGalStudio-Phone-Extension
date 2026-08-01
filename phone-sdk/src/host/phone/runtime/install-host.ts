/**
 * @file install-host.ts
 * @description 在手机扩展内安装 Phone SDK 宿主，维护全局共享的已注册应用表。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 *
 * @remarks
 * 宿主只提供注册表与安装生命周期，**不编写、不内置**任何内页应用。
 * 内页应用由外部通过 `@ink-zenly/phone-sdk/plugin` 的 `registerPhoneApp` 注册。
 */

import {
  getPhoneSdkAppsRegistry,
  getPhoneSdkSlot,
  installPhoneSdkHost,
  phoneSdkDiag,
  toPhoneAppId,
  type PhoneAppRegistration,
  type PhoneSdkHost,
} from "@ink-zenly/phone-sdk/plugin";

/**
 * 将旧宿主闭包中的应用迁移进全局共享注册表。
 *
 * @param previousHost - 即将被替换的宿主；无则跳过
 * @returns 迁移写入的 id 列表
 *
 * @remarks
 * Studio 热重载后旧 `host.listApps()` 可能仍指向模块私有 Map，而 `slot.apps` 为空；
 * 若不迁移，重装宿主后第三方应用会「凭空消失」。
 */
function migrateAppsFromPreviousHost(
  previousHost: PhoneSdkHost | undefined,
): string[] {
  if (!previousHost) return [];

  const registry = getPhoneSdkAppsRegistry();
  const migrated: string[] = [];

  for (const app of previousHost.listApps()) {
    const existing = registry.get(app.id);
    if (!existing) {
      registry.set(app.id, app);
      migrated.push(app.id);
    }
  }

  return migrated;
}

/**
 * 创建并安装 Phone SDK 宿主。
 *
 * 注册表存放在 `globalThis.__LetsGalPhoneSdk__.apps`；宿主方法每次现取该表，
 * 禁止闭包缓存 Map 引用。
 * 安装后若外部挂了 `slot.pluginDevReregister` 则调用（宿主自身不注册任何内页应用）。
 *
 * @returns 卸载函数；调用后解除宿主挂载（不清空已注册应用）
 *
 * @example
 * ```ts
 * static onRegister() {
 *   installPhoneExtensionSdkHost();
 * }
 * ```
 */
export function installPhoneExtensionSdkHost(): () => void {
  const slot = getPhoneSdkSlot();
  const migratedIds = migrateAppsFromPreviousHost(slot.host);
  const registry = getPhoneSdkAppsRegistry();

  phoneSdkDiag("准备安装 Phone SDK 宿主", {
    phase: "before-install",
    queueLengthBefore: slot.queue.length,
    queuedIdsBefore: slot.queue.map((item) => item.id),
    appsAlreadyInRegistry: [...registry.keys()],
    migratedFromPreviousHost: migratedIds,
    previousHostListIds: slot.host?.listApps().map((app) => app.id) ?? [],
    hasPluginDevReregister: typeof slot.pluginDevReregister === "function",
  });

  const host: PhoneSdkHost = {
    registerApp(app) {
      const apps = getPhoneSdkAppsRegistry();
      const overwritten = apps.has(app.id);
      if (overwritten) {
        console.warn("[phone] Phone SDK 同 id 应用将被覆盖", app.id);
      }
      apps.set(app.id, app);
      phoneSdkDiag("宿主 registerApp", {
        phase: "registerApp",
        id: app.id,
        title: app.title,
        overwritten,
      });
    },
    unregisterApp(id) {
      const key = toPhoneAppId(id) ?? id;
      const apps = getPhoneSdkAppsRegistry();
      const existed = apps.delete(key);
      phoneSdkDiag("宿主 unregisterApp", {
        phase: "unregisterApp",
        id: key,
        existed,
      });
    },
    getApp(id) {
      const key = toPhoneAppId(id) ?? id;
      return getPhoneSdkAppsRegistry().get(key);
    },
    listApps() {
      return [...getPhoneSdkAppsRegistry().values()];
    },
  };

  const dispose = installPhoneSdkHost(host);

  phoneSdkDiag("Phone SDK 宿主已安装并刷队", {
    phase: "after-install",
  });

  // 外部（扩展入口 / 第三方）可选钩子：宿主不编写、不内置任何内页应用。
  if (typeof slot.pluginDevReregister === "function") {
    try {
      phoneSdkDiag("调用外部 pluginDevReregister", { phase: "plugin-reregister" });
      slot.pluginDevReregister();
    } catch (error) {
      console.warn("[phone-sdk-diag] pluginDevReregister 失败", error);
    }
  }

  phoneSdkDiag("宿主安装流程结束", {
    phase: "install-complete",
  });

  return () => {
    phoneSdkDiag("卸载 Phone SDK 宿主", { phase: "dispose" });
    dispose();
  };
}

/**
 * 供手机 UI 查询已注册应用（读全局共享表）。
 *
 * @param id 程序 ID，或 Studio 引用 `扩展ID/程序ID`
 * @returns 注册对象或 `undefined`
 */
export function lookupPhoneSdkApp(id: string): PhoneAppRegistration | undefined {
  const key = toPhoneAppId(id);
  if (!key) return undefined;
  return getPhoneSdkAppsRegistry().get(key);
}
