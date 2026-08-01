/**
 * @file bootstrap.ts
 * @description 内页应用引导：挂接宿主重装钩子并执行注册清单。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.0
 *
 * @remarks
 * 宿主（main）不编写内页；扩展入口调用本 API，把 `src/<app-id>/` 的注册函数灌入。
 *
 * @example
 * ```ts
 * // src/index.tsx
 * import {
 *   bootstrapPhonePluginApps,
 *   definePhonePluginRegistry,
 * } from "@ink-zenly/phone-sdk/plugin";
 * import { registerDemoShopPhoneApp } from "./demo-shop";
 *
 * bootstrapPhonePluginApps(
 *   definePhonePluginRegistry(registerDemoShopPhoneApp),
 * );
 * ```
 */

import { phoneSdkDiag } from "../debug/diag";
import { getPhoneSdkSlot } from "../runtime/slot";
import type { PhonePluginAppRegistrar } from "./registry";
import { registerAllPhonePluginApps } from "./registry";

/**
 * 引导内页应用：挂接 `slot.pluginDevReregister`，并立即执行一次注册。
 *
 * @param registerAll - 批量注册回调；省略时使用 `addPhonePluginApp` 累积的清单
 * @returns void
 *
 * @remarks
 * - 应在扩展入口尽早调用（早于或接近宿主 `onRegister`）。
 * - 宿主每次 `installPhoneExtensionSdkHost` 后若存在钩子会再次调用。
 */
export function bootstrapPhonePluginApps(
  registerAll?: PhonePluginAppRegistrar,
): void {
  const run = registerAll ?? registerAllPhonePluginApps;

  phoneSdkDiag("plugin bootstrap：开始注册清单", {
    phase: "plugin-bootstrap-start",
  });

  const slot = getPhoneSdkSlot();

  slot.pluginDevReregister = () => {
    phoneSdkDiag("pluginDevReregister：重新注册 plugin 清单", {
      phase: "plugin-reregister-run",
    });
    run();
  };

  phoneSdkDiag("已挂接 slot.pluginDevReregister", {
    phase: "plugin-reregister-attached",
  });

  run();

  phoneSdkDiag("plugin bootstrap：清单已求值（registerPhoneApp 应已执行或入队）", {
    phase: "plugin-bootstrap-done",
  });
}
