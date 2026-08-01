/**
 * @file dev-registry.ts
 * @description 内页应用注册清单工具：收集并批量执行 register 函数。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.0
 *
 * @remarks
 * 应用 UI 仍写在扩展侧 `src/<app-id>/`；本模块只提供清单容器，不包含具体应用。
 *
 * @example
 * ```ts
 * import {
 *   addPhonePluginApp,
 *   registerAllPhonePluginApps,
 * } from "@ink-zenly/phone-sdk/plugin";
 * import { registerDemoShopPhoneApp } from "./demo-shop";
 *
 * addPhonePluginApp(registerDemoShopPhoneApp);
 * registerAllPhonePluginApps();
 * ```
 */

/**
 * 单个内页应用的注册函数（通常为 `registerXxxPhoneApp`）。
 */
export type PhonePluginAppRegistrar = () => void;

/** 当前扩展入口登记的注册函数列表（模块级，随 bundle 生命周期）。 */
const registrars: PhonePluginAppRegistrar[] = [];

/**
 * 将一个内页应用注册函数加入清单。
 *
 * @param register - 无参注册函数；内部应调用 `registerPhoneApp`
 * @returns void
 *
 * @remarks
 * 不会立即执行；需再调用 `registerAllPhonePluginApps` 或经 `bootstrapPhonePluginApps`。
 */
export function addPhonePluginApp(register: PhonePluginAppRegistrar): void {
  registrars.push(register);
}

/**
 * 清空清单（测试或热重载重建清单时可用）。
 *
 * @returns void
 */
export function clearPhonePluginApps(): void {
  registrars.length = 0;
}

/**
 * 依次执行清单中的全部注册函数。
 *
 * @returns void
 * @throws 不抛出；单个应用非法参数由 `registerPhoneApp` 警告并忽略
 */
export function registerAllPhonePluginApps(): void {
  for (const register of registrars) {
    register();
  }
}

/**
 * 用若干注册函数拼成一个批量注册回调（不写入模块级清单）。
 *
 * @param apps - 注册函数列表
 * @returns 可传给 `bootstrapPhonePluginApps` 的批量函数
 *
 * @example
 * ```ts
 * bootstrapPhonePluginApps(
 *   definePhonePluginRegistry(registerDemoShopPhoneApp, registerDemoBrowserPhoneApp),
 * );
 * ```
 */
export function definePhonePluginRegistry(
  ...apps: PhonePluginAppRegistrar[]
): PhonePluginAppRegistrar {
  return () => {
    for (const register of apps) {
      register();
    }
  };
}
