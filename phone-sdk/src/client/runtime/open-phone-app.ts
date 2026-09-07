/**
 * @file open-phone-app.ts
 * @description 插件侧打开手机内页应用的外壳 API；无宿主时 warn 并 resolve。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.5.0
 */

import { getPhoneSdkSlot } from "./slot";
import type { OpenPhoneAppOptions, OpenPhoneAppResult } from "./types";

/**
 * 打开指定手机内页应用。
 *
 * @param options 目标应用 id、等待策略与可选 payload
 * @returns 可判定的打开结果；旧版宿主返回 `void` 时按成功打开处理
 *
 * @remarks
 * - 空 `appId`：打印 warn 并忽略
 * - 未安装导航宿主：打印 warn 并忽略，避免插件脚本卡死
 */
export async function openPhoneApp(
  options: OpenPhoneAppOptions,
): Promise<OpenPhoneAppResult> {
  const appId = String(options.appId ?? "").trim();
  if (!appId) {
    console.warn("[phone-sdk] openPhoneApp: 空 appId，已忽略");
    return "invalid";
  }
  const nav = getPhoneSdkSlot().navigation;
  if (!nav) {
    console.warn("[phone-sdk] openPhoneApp: 手机宿主未安装，已忽略", { appId });
    return "unavailable";
  }
  const result = await nav.openPhoneApp({
    appId,
    waitUntil: options.waitUntil === "none" ? "none" : "close",
    ...(options.position ? { position: options.position } : {}),
    ...(options.payload ? { payload: options.payload } : {}),
  });
  return result ?? "opened";
}
