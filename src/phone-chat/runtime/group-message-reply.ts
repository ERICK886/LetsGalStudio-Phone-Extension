/**
 * @file group-message-reply.ts
 * @description “群成员发送消息”组合执行：写入成员消息，并可附带玩家回复门闩。
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import {
  coerceMethodBoolean,
  normalizeOutgoingStatus,
  parseFriendMessagesFromParams,
  parseRepliesFromParams,
} from "../domain/index";
import { awaitGroupReply, sendGroupMessages } from "./actions";
import { closeChatPhoneAppAfter, openGroupChatPhoneApp } from "./open-phone";

/**
 * 写入群成员消息；存在回复选项时，同步写入玩家回复并按配置等待。
 * 调用前须由方法入口完成聊天 save 与作者设置绑定。
 */
export async function executeGroupMemberMessage(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  allowWait: boolean,
  options: { openPhoneApp: boolean },
): Promise<void> {
  const groupId = String(params.groupId ?? "").trim();
  const senderCharacterId = String(params.sender ?? "").trim();
  const messages = parseFriendMessagesFromParams(params);
  if (!groupId || !senderCharacterId || messages.length === 0) return;

  await sendGroupMessages({ groupId, senderCharacterId, messages });
  const replies = parseRepliesFromParams(params);
  const requireReply =
    replies.length > 0 && coerceMethodBoolean(params.requireReply, true);
  const waitForReply = allowWait && requireReply;
  // 必答回复必须强制打开对应群聊，否则手机关闭时会形成不可完成的剧情门闩。
  const shouldOpen =
    options.openPhoneApp &&
    (waitForReply || coerceMethodBoolean(params.openPhone, true));
  const closePhoneAfter =
    waitForReply && coerceMethodBoolean(params.closePhoneAfter, false);
  const waitUntilClose =
    shouldOpen &&
    coerceMethodBoolean(params.waitUntilClose, false) &&
    !closePhoneAfter;

  if (replies.length > 0) {
    await awaitGroupReply(ctx, {
      groupId,
      replies,
      outgoingStatus: normalizeOutgoingStatus(params.outgoingStatus),
      allowWait,
      waitForReply,
      onPendingWritten:
        waitForReply && shouldOpen
          ? () =>
              openGroupChatPhoneApp({
                groupId,
                waitUntil: waitUntilClose ? "close" : "none",
              })
          : undefined,
    });

    if (waitForReply) {
      if (closePhoneAfter) {
        const rawDelay = Number(params.closeDelayMs);
        const delayMs =
          Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : 1000;
        await closeChatPhoneAppAfter(delayMs);
      }
      return;
    }
  }

  if (!shouldOpen) return;
  await openGroupChatPhoneApp({
    groupId,
    waitUntil: waitUntilClose ? "close" : "none",
  });
}
