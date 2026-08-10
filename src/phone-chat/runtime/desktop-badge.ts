/**
 * @file desktop-badge.ts
 * @description 将聊天总未读同步到手机桌面角标（phone-sdk 内存态）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @example
 * ```ts
 * syncChatDesktopBadge();
 * ```
 */

import {
  clearPhoneAppBadge,
  setPhoneAppBadge,
} from "@ink-zenly/phone-sdk/plugin";

import { PROGRAM_ID } from "../constants";
import { readChatState } from "./store";

/**
 * 汇总全部会话未读条数，并写入桌面角标。
 *
 * @returns 当前总未读数
 *
 * @remarks
 * - `total > 0` → `{ mode: "count", count: total }`
 * - `total === 0` → `clearPhoneAppBadge`
 * - 依赖 phone-sdk ≥ 0.5.4；宿主桌面须绑定 `phoneAppId = phone-chat`
 */
export function syncChatDesktopBadge(): number {
  const threads = readChatState().threads ?? [];
  const total = threads.reduce(
    (sum, thread) => sum + (Number(thread.unreadCount) || 0),
    0,
  );

  if (total > 0) {
    setPhoneAppBadge(PROGRAM_ID, { mode: "count", count: total });
  } else {
    clearPhoneAppBadge(PROGRAM_ID);
  }

  return total;
}
