/**
 * @file close-phone-app.ts
 * @description 插件侧关闭手机外壳 API；无宿主时 warn 并 resolve。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.5.1
 */

import { getPhoneSdkSlot } from "./slot";
import {
  clearPhoneCloseLocks,
  isPhoneCloseLocked,
} from "./phone-close-lock";
import type { ClosePhoneAppOptions } from "./types";

/**
 * 关闭整部手机 UI。
 *
 * @returns 无宿主时立即 resolve；有宿主时委托 `slot.navigation.closePhoneApp`
 *
 * @remarks
 * - 未安装导航宿主：打印 warn 并忽略，避免插件脚本卡死
 * - `animated` 默认 `true`，复用宿主 UI 的关闭动画
 * - `animated: false` 时由宿主立即隐藏手机 UI
 *
 * @example
 * ```ts
 * await closePhoneApp();
 * await closePhoneApp({ animated: false });
 * ```
 */
export async function closePhoneApp(
  options: ClosePhoneAppOptions = {},
): Promise<void> {
  const slot = getPhoneSdkSlot();
  if (options.force) {
    // force 表示强制交互已经完成。这里既要绕过锁，也要释放遗留令牌，
    // 否则下一次普通打开仍会被旧来电的关闭锁拦住。
    clearPhoneCloseLocks();
  } else if (isPhoneCloseLocked()) {
    return;
  }
  const nav = slot.navigation;
  if (!nav?.closePhoneApp) {
    console.warn("[phone-sdk] closePhoneApp: 手机宿主未安装，已忽略");
    return;
  }
  await nav.closePhoneApp(options);
}
