/**
 * @file open-phone.ts
 * @description 通过 Phone SDK 打开 / 关闭聊天内页应用的封装。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.2.0
 */

import { closePhoneApp, openPhoneApp } from "@ink-zenly/phone-sdk/plugin";

import { PROGRAM_ID } from "../constants";
import {
  directConversationId,
  groupConversationId,
} from "../domain/conversations";

export async function openChatConversation(options: {
  conversationId: string;
  waitUntil: "close" | "none";
}): Promise<void> {
  const conversationId = options.conversationId.trim();
  if (!conversationId) return;
  const result = await openPhoneApp({
    appId: PROGRAM_ID,
    waitUntil: options.waitUntil,
    payload: { conversationId },
  });
  if (result !== "opened") {
    throw new Error(`无法打开聊天界面（${result}）`);
  }
}

/**
 * 打开聊天内页并携带目标好友 ID 作为深链 payload。
 *
 * @param options.friendCharacterId - 目标好友角色 ID；空值时跳过
 * @param options.waitUntil - `"close"` 等待玩家关闭手机，`"none"` 立即返回
 *
 * @remarks
 * 未安装手机宿主时 `openPhoneApp` 内部会 warn 并 resolve，调用方不会卡死。
 *
 * @example
 * ```ts
 * await openChatPhoneApp({ friendCharacterId: "mika", waitUntil: "none" });
 * ```
 */
export async function openChatPhoneApp(options: {
  friendCharacterId: string;
  waitUntil: "close" | "none";
}): Promise<void> {
  const friendCharacterId = options.friendCharacterId.trim();
  if (!friendCharacterId) return;
  await openChatConversation({
    conversationId: directConversationId(friendCharacterId),
    waitUntil: options.waitUntil,
  });
}

/** 打开指定群聊。 */
export async function openGroupChatPhoneApp(options: {
  groupId: string;
  waitUntil: "close" | "none";
}): Promise<void> {
  const groupId = options.groupId.trim();
  if (!groupId) return;
  await openChatConversation({
    conversationId: groupConversationId(groupId),
    waitUntil: options.waitUntil,
  });
}

/**
 * 关闭整部手机 UI（优先关闭动画）。
 *
 * @remarks
 * 未安装手机宿主时 `closePhoneApp` 内部会 warn 并 resolve。
 *
 * @example
 * ```ts
 * await closeChatPhoneApp();
 * ```
 */
export async function closeChatPhoneApp(): Promise<void> {
  await closePhoneApp();
}

/**
 * 延迟指定毫秒后关闭手机。
 *
 * @param delayMs - 延迟毫秒；负数或 NaN 时按 0 处理
 *
 * @example
 * ```ts
 * await closeChatPhoneAppAfter(1000);
 * ```
 */
export async function closeChatPhoneAppAfter(delayMs: number): Promise<void> {
  const ms = Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 0;
  if (ms > 0) {
    await new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, ms);
    });
  }
  await closeChatPhoneApp();
}
