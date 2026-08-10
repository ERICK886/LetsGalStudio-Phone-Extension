/**
 * @file actions.ts
 * @description 会话写入、回复选项、好友增删与玩家点选回复（编排 domain + runtime）。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.2.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import {
  applyReplyEffects,
  appendMessagesToThreads,
  clearThreadUnread,
  resolveFriendIds,
  type AppendMessageInput,
} from "../domain/index";
import type { ChatMessageStatus, ChatReplyOption } from "../types/index";
import { emitChatBus, getOpenChatFriendId, isViewingChat } from "./bus";
import { syncChatDesktopBadge } from "./desktop-badge";
import {
  createReplyWait,
  resolveReplyWait,
  resolveReplyWaitsForFriend,
} from "./reply-wait";
import { getCachedAuthorSettings } from "./settings";
import { patchChatState, readChatState } from "./store";

/**
 * 向指定好友会话追加纯消息（不携带回复选项）。
 *
 * @param options.friendCharacterId - 目标好友角色 ID
 * @param options.messages - 待追加消息列表；为空时不执行任何写入
 * @returns 当消息为空或好友 ID 无效时立即结束
 *
 * @example
 * ```ts
 * await sendFriendMessages({
 *   friendCharacterId: "mika",
 *   messages: [{ text: "嗨", direction: "incoming", status: "read" }],
 * });
 * ```
 */
export async function sendFriendMessages(options: {
  friendCharacterId: string;
  messages: readonly AppendMessageInput[];
}): Promise<void> {
  const friendId = options.friendCharacterId.trim();
  if (!friendId || options.messages.length === 0) return;

  const viewing = isViewingChat(friendId);
  const state = readChatState();
  const { threads, appended } = appendMessagesToThreads(
    state.threads,
    friendId,
    options.messages,
    { bumpUnread: !viewing },
  );

  patchChatState({ threads }, "send-friend-messages");
  if (appended.length > 0) {
    emitChatBus({
      type: "messages-appended",
      friendCharacterId: friendId,
      messages: appended,
    });
  }
  syncChatDesktopBadge();
}

/**
 * 设置某好友的玩家可选回复，并挂起或快进处理。
 *
 * @param ctx - 扩展上下文，用于快进时自动点选回复并应用效果
 * @param options.friendCharacterId - 目标好友角色 ID
 * @param options.replies - 可选回复列表；为空时不执行任何写入
 * @param options.outgoingStatus - 玩家点选后发出的 outgoing 消息状态
 * @param options.allowWait - false 时为快进/skip：自动点选第一条（与「非必须回复」不同）
 * @param options.waitForReply - 仅 `allowWait===true` 时生效；true 挂起剧情至点选，
 *   false 仅写入 pending（无 waitToken）并立即返回，供玩家稍后在手机内回复
 * @param options.onPendingWritten - 写入 pending 后、挂起等待前回调（通常用于打开手机）
 * @returns 等待模式下返回 Promise；非必须 / 快进模式下立即结束
 *
 * @example
 * ```ts
 * // 必须回复：挂起
 * await awaitPlayerReply(ctx, {
 *   friendCharacterId: "mika",
 *   replies: [{ id: "r1", text: "你好", effects: [] }],
 *   outgoingStatus: "read",
 *   allowWait: true,
 *   waitForReply: true,
 * });
 *
 * // 非必须：写入选项后继续剧情
 * await awaitPlayerReply(ctx, {
 *   friendCharacterId: "mika",
 *   replies: [{ id: "r1", text: "你好", effects: [] }],
 *   outgoingStatus: "read",
 *   allowWait: true,
 *   waitForReply: false,
 * });
 * ```
 */
export async function awaitPlayerReply(
  ctx: ExtensionContext,
  options: {
    friendCharacterId: string;
    replies: readonly ChatReplyOption[];
    outgoingStatus: ChatMessageStatus;
    allowWait: boolean;
    /**
     * 是否挂起剧情直到玩家点选。
     *
     * @remarks
     * 仅在 `allowWait===true` 时有意义；缺省 `true`（必须回复）。
     * `false` 时写入 pending 且不带 `waitToken`，剧情立即继续。
     */
    waitForReply?: boolean;
    /**
     * 写入 pending 回复后、挂起等待前回调。
     *
     * @remarks
     * 用于在玩家可见回复选项后打开手机内页（深链）；
     * 仅在「必须回复」挂起分支触发。
     */
    onPendingWritten?: () => void | Promise<void>;
  },
): Promise<void> {
  const friendId = options.friendCharacterId.trim();
  if (!friendId || options.replies.length === 0) return;

  resolveReplyWaitsForFriend(friendId);

  const outgoingStatus = options.outgoingStatus;

  // 快进 / skip：自动点选第一条（不是「非必须回复」）
  if (!options.allowWait) {
    const first = options.replies[0];
    if (!first) return;

    patchChatState(
      {
        pendingReplies: {
          friendCharacterId: friendId,
          options: [...options.replies],
          outgoingStatus,
        },
      },
      "await-player-reply-skip",
    );
    selectPlayerReply(ctx, first.id);
    return;
  }

  const waitForReply = options.waitForReply !== false;

  // 非必须回复：只留下可选回复，不挂起、不开手机
  if (!waitForReply) {
    patchChatState(
      {
        pendingReplies: {
          friendCharacterId: friendId,
          options: [...options.replies],
          outgoingStatus,
        },
      },
      "await-player-reply-optional",
    );
    emitChatBus({ type: "replies-changed", friendCharacterId: friendId });
    return;
  }

  // 必须回复：写入 waitToken 并挂起至点选
  const wait = createReplyWait(friendId);
  patchChatState(
    {
      pendingReplies: {
        friendCharacterId: friendId,
        options: [...options.replies],
        waitToken: wait.token,
        outgoingStatus,
      },
    },
    "await-player-reply",
  );
  emitChatBus({ type: "replies-changed", friendCharacterId: friendId });
  if (options.onPendingWritten) {
    await options.onPendingWritten();
  }
  await wait.promise;
}

/**
 * 动态添加好友（从 removed 移除并加入 extra）。
 *
 * @param characterId - 角色 ID
 */
export function addFriend(characterId: string): void {
  const id = characterId.trim();
  if (!id) return;
  const state = readChatState();
  const friendsRemoved = state.friendsRemoved.filter((item) => item !== id);
  const friendsExtra = state.friendsExtra.includes(id)
    ? state.friendsExtra
    : [...state.friendsExtra, id];
  patchChatState({ friendsExtra, friendsRemoved }, "add-friend");
}

/**
 * 动态移除好友（仅隐藏列表，保留历史消息）。
 *
 * @param characterId - 角色 ID
 */
export function removeFriend(characterId: string): void {
  const id = characterId.trim();
  if (!id) return;
  const state = readChatState();
  const friendsExtra = state.friendsExtra.filter((item) => item !== id);
  const friendsRemoved = state.friendsRemoved.includes(id)
    ? state.friendsRemoved
    : [...state.friendsRemoved, id];
  if (state.pendingReplies?.friendCharacterId === id) {
    resolveReplyWaitsForFriend(id);
    patchChatState(
      { friendsExtra, friendsRemoved, pendingReplies: null },
      "remove-friend",
    );
    emitChatBus({ type: "replies-changed", friendCharacterId: null });
    return;
  }
  patchChatState({ friendsExtra, friendsRemoved }, "remove-friend");
}

/**
 * 玩家点选一条可选回复。
 *
 * @param ctx - 用于写变量的扩展上下文（宿主内页上下文亦可）
 * @param replyId - 回复选项 ID
 * @returns 是否成功处理
 *
 * @throws 不抛出；无效选项时返回 false
 */
export function selectPlayerReply(
  ctx: ExtensionContext,
  replyId: string,
): boolean {
  const state = readChatState();
  const pending = state.pendingReplies;
  if (!pending) return false;
  const option = pending.options.find((item) => item.id === replyId);
  if (!option) return false;

  const friendId = pending.friendCharacterId;
  const status = pending.outgoingStatus ?? "read";
  const viewing = isViewingChat(friendId);
  const { threads, appended } = appendMessagesToThreads(
    state.threads,
    friendId,
    [{ text: option.text, direction: "outgoing", status }],
    { bumpUnread: false },
  );

  applyReplyEffects(ctx, option.effects);
  const waitToken = pending.waitToken;
  patchChatState({ threads, pendingReplies: null }, "select-reply");
  resolveReplyWait(waitToken);

  if (appended.length > 0) {
    emitChatBus({
      type: "messages-appended",
      friendCharacterId: friendId,
      messages: appended,
    });
  }
  emitChatBus({ type: "replies-changed", friendCharacterId: null });

  if (viewing) {
    patchChatState(
      { threads: clearThreadUnread(readChatState().threads, friendId) },
      "select-reply-clear-unread",
    );
    syncChatDesktopBadge();
  }

  return true;
}

/**
 * 打开聊天页时清未读。
 *
 * @param friendCharacterId - 好友 ID
 */
export function markChatOpened(friendCharacterId: string): void {
  const friendId = friendCharacterId.trim();
  if (!friendId) return;
  const threads = clearThreadUnread(readChatState().threads, friendId);
  patchChatState({ threads }, "open-chat");
  syncChatDesktopBadge();
}

/**
 * 合并默认好友与存档增删。
 *
 * @returns 可见好友 ID 列表
 */
export function listVisibleFriendIds(): string[] {
  const settings = getCachedAuthorSettings();
  const state = readChatState();
  return resolveFriendIds(
    settings.defaultFriends,
    state.friendsExtra,
    state.friendsRemoved,
  );
}

/**
 * 当前打开聊天好友（供调试）。
 *
 * @returns 好友 ID 或 null
 */
export function currentOpenChatFriendId(): string | null {
  return getOpenChatFriendId();
}
