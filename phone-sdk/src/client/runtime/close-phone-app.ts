/**
 * @file close-phone-app.ts
 * @description 插件侧关闭手机外壳 API；无宿主时 warn 并 resolve。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.5.1
 */

import { getPhoneSdkSlot } from "./slot";
import { isPhoneCloseLocked } from "./phone-close-lock";

/**
 * 关闭整部手机 UI。
 *
 * @returns 无宿主时立即 resolve；有宿主时委托 `slot.navigation.closePhoneApp`
 *
 * @remarks
 * - 未安装导航宿主：打印 warn 并忽略，避免插件脚本卡死
 * - 宿主优先走 UI 关闭动画；未挂载 UI 时回退为直接 hide
 *
 * @example
 * ```ts
 * await closePhoneApp();
 * ```
 */
export async function closePhoneApp(): Promise<void> {
  const slot = getPhoneSdkSlot();
  if (isPhoneCloseLocked()) return;
  const nav = slot.navigation;
  if (!nav?.closePhoneApp) {
    console.warn("[phone-sdk] closePhoneApp: 手机宿主未安装，已忽略");
    return;
  }
  await nav.closePhoneApp();
}
