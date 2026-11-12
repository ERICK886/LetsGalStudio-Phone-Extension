import type { ExtensionContext } from "@avg-studio/sdk";
import { getChatRuntimeKey } from "./runtime-scope";
import { bindChatSaveForContext } from "./store";
import { isChatRestoreReplay } from "./restore-replay";
import { coerceMethodBoolean, normalizeOutgoingStatus, parseFriendMessagesFromParams, parseRepliesFromParams } from "../domain/index";
import { awaitGroupReply, awaitPlayerReply, sendFriendMessages } from "./actions";
import { cacheAuthorSettings, readAuthorSettings } from "./settings";
import { closeChatPhoneAppAfter, openChatPhoneApp, openGroupChatPhoneApp } from "./open-phone";
import { executeGroupMemberMessage } from "./group-message-reply";

/**
 * 绑定 save 并刷新作者设置缓存。
 *
 * @param instanceSave - 本模块实例 this.save
 * @param ctx - 扩展上下文
 */
export function prepareRuntime(instanceSave: unknown, ctx: ExtensionContext): void {
  bindChatSaveForContext(instanceSave as Parameters<typeof bindChatSaveForContext>[0], ctx);
  cacheAuthorSettings(readAuthorSettings(ctx), getChatRuntimeKey(ctx));
}

/**
 * 执行「对方发送消息」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数（含 `friend` 与 `message` 槽位，及 `openPhone` / `waitUntilClose`）
 * @param instanceSave - 包装类实例 this.save
 * @param options.openPhoneApp - 是否在写入消息后打开手机内页；
 *   仅 `run` 路径置 true，`runImmediately` / `skip` 置 false
 * @returns Promise<void>
 *
 * @remarks
 * 提取为模块级辅助函数，避免 `runImmediately` / `skip` 在静态属性初始化器中
 * 自引用 `chatSendFriendMessagesMethod.run`，从而触发 TS7022/TS7023。
 */
export async function executeSendFriendMessages(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
  options: { openPhoneApp: boolean },
): Promise<void> {
  const signal = ctx.flow.signal;
  prepareRuntime(instanceSave, ctx);
  if (isChatRestoreReplay(ctx)) return;
  const friendCharacterId = String(params.friend ?? "");
  const messages = parseFriendMessagesFromParams(params);
  if (!friendCharacterId.trim() || messages.length === 0) return;
  await sendFriendMessages({
    friendCharacterId,
    messages,
  }, getChatRuntimeKey(ctx));

  // schema 默认打开；仅当明确为 false（含字符串 "false"）时跳过。
  // 未打开时绝不能 waitUntilClose，否则会卡在等待关手机。
  const shouldOpen =
    options.openPhoneApp && coerceMethodBoolean(params.openPhone, true);
  if (!shouldOpen || signal.aborted) return;

  const waitUntilClose = coerceMethodBoolean(params.waitUntilClose, false);
  await openChatPhoneApp({
    friendCharacterId,
    waitUntil: waitUntilClose ? "close" : "none",
  });
}

export async function executeSendGroupMessages(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
  allowWait: boolean,
  options: { openPhoneApp: boolean },
): Promise<void> {
  prepareRuntime(instanceSave, ctx);
  if (isChatRestoreReplay(ctx)) return;
  await executeGroupMemberMessage(ctx, params, allowWait, options);
}

/**
 * 执行「等待玩家回复」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数（含 `friend`、`reply` 槽位、`requireReply`、`openPhone` 等）
 * @param instanceSave - 包装类实例 this.save
 * @param allowWait - true 时按 `requireReply` 决定挂起或仅写入；false 时自动点选第一条（快进/skip）
 * @param options.openPhoneApp - 运行路径是否允许打开手机（`run` 为 true）
 * @returns Promise<void>
 *
 * @remarks
 * - **必须回复**（默认）：打开手机并深开该好友会话，挂起至玩家点选
 * - **非必须**：只写入可选回复，不打开手机、不挂起；玩家稍后打开手机仍可回复
 */
export async function executeAwaitPlayerReply(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
  allowWait: boolean,
  options: { openPhoneApp: boolean },
): Promise<void> {
  const signal = ctx.flow.signal;
  prepareRuntime(instanceSave, ctx);
  if (isChatRestoreReplay(ctx)) return;
  const outgoingStatus = normalizeOutgoingStatus(params.outgoingStatus);
  const friendCharacterId = String(params.friend ?? "");
  const replies = parseRepliesFromParams(params);
  if (!friendCharacterId.trim() || replies.length === 0) return;
  const requireReply = coerceMethodBoolean(params.requireReply, true);
  // 正常 run + 必须回复 → 挂起；非必须 → 只写 pending
  const waitForReply = allowWait && requireReply;
  // 必须回复时强制打开并跳转会话；非必须绝不打开
  const shouldOpenPhone = options.openPhoneApp && waitForReply;

  await awaitPlayerReply(ctx, {
    friendCharacterId,
    replies,
    outgoingStatus,
    allowWait,
    waitForReply,
    onPendingWritten: shouldOpenPhone
      ? () => openChatPhoneApp({ friendCharacterId, waitUntil: "none" })
      : undefined,
  });

  // 仅「必须回复且确实挂起过」时才可能关手机
  if (!signal.aborted && waitForReply && coerceMethodBoolean(params.closePhoneAfter, false)) {
    const rawDelay = Number(params.closeDelayMs);
    const delayMs =
      Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : 1000;
    await closeChatPhoneAppAfter(delayMs, signal);
  }
}

export async function executeAwaitGroupReply(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
  allowWait: boolean,
  options: { openPhoneApp: boolean },
): Promise<void> {
  const signal = ctx.flow.signal;
  prepareRuntime(instanceSave, ctx);
  if (isChatRestoreReplay(ctx)) return;
  const groupId = String(params.groupId ?? "").trim();
  const replies = parseRepliesFromParams(params);
  if (!groupId || replies.length === 0) return;

  const requireReply = coerceMethodBoolean(params.requireReply, true);
  const waitForReply = allowWait && requireReply;
  const shouldOpenPhone = options.openPhoneApp && waitForReply;
  await awaitGroupReply(ctx, {
    groupId,
    replies,
    outgoingStatus: normalizeOutgoingStatus(params.outgoingStatus),
    allowWait,
    waitForReply,
    onPendingWritten: shouldOpenPhone
      ? () => openGroupChatPhoneApp({ groupId, waitUntil: "none" })
      : undefined,
  });

  if (!signal.aborted && waitForReply && coerceMethodBoolean(params.closePhoneAfter, false)) {
    const rawDelay = Number(params.closeDelayMs);
    const delayMs =
      Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : 1000;
    await closeChatPhoneAppAfter(delayMs, signal);
  }
}
