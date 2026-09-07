/**
 * @file actions.ts
 * @description 单聊 / 群聊消息、待回复、未读与好友状态编排。
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import {
  applyReplyEffects,
  appendMessagesToConversation,
  clearConversationUnread,
  conversationIdForPending,
  conversationIdForTarget,
  directConversationId,
  findGroupDefinition,
  groupConversationId,
  parseConversationId,
  resolveGroupDefinitions,
  resolveFriendIds,
  type AppendMessageInput,
  type ChatConversationTarget,
} from "../domain/index";
import type {
  ChatGroupDefinition,
  ChatGroupMemberOverride,
  ChatMessageStatus,
  ChatPendingReplies,
  ChatReplyOption,
} from "../types/index";
import {
  emitChatBus,
  getOpenConversationId,
  isViewingConversation,
} from "./bus";
import { syncChatDesktopBadge } from "./desktop-badge";
import {
  createReplyWait,
  resolveReplyWait,
  resolveReplyWaitsForConversation,
} from "./reply-wait";
import { getCachedAuthorSettings } from "./settings";
import { patchChatState, readChatState } from "./store";

function pendingFields(
  target: ChatConversationTarget,
): Pick<ChatPendingReplies, "conversationId" | "friendCharacterId" | "groupId"> {
  const conversationId = conversationIdForTarget(target);
  return target.kind === "group"
    ? { conversationId, friendCharacterId: "", groupId: target.groupId.trim() }
    : {
        conversationId,
        friendCharacterId: target.friendCharacterId.trim(),
      };
}

function upsertPendingReplies(pending: ChatPendingReplies): void {
  const conversationId = conversationIdForPending(pending);
  const state = readChatState();
  patchChatState(
    {
      pendingReplies: [
        ...state.pendingReplies.filter(
          (item) => conversationIdForPending(item) !== conversationId,
        ),
        pending,
      ],
    },
    "upsert-pending-replies",
  );
}

function removePendingReplies(conversationId: string): ChatPendingReplies | undefined {
  const state = readChatState();
  const removed = state.pendingReplies.find(
    (item) => conversationIdForPending(item) === conversationId,
  );
  if (!removed) return undefined;
  patchChatState(
    {
      pendingReplies: state.pendingReplies.filter(
        (item) => conversationIdForPending(item) !== conversationId,
      ),
    },
    "remove-pending-replies",
  );
  return removed;
}

/** 同一会话出现新回复组时先结算旧回复，避免旧剧情等待永久悬挂。 */
function settleReplacedPending(
  ctx: ExtensionContext,
  conversationId: string,
): void {
  const previous = readChatState().pendingReplies.find(
    (item) => conversationIdForPending(item) === conversationId,
  );
  if (!previous) return;

  const first = previous.options[0];
  if (previous.waitToken && first) {
    console.warn(
      `[phone-chat] 会话 ${conversationId} 的必选回复被新回复组覆盖，已自动选择第一项`,
    );
    selectPlayerReply(ctx, first.id, conversationId);
    return;
  }

  resolveReplyWait(previous.waitToken);
  removePendingReplies(conversationId);
  emitChatBus({ type: "replies-changed", conversationId });
}

export async function sendConversationMessages(options: {
  target: ChatConversationTarget;
  messages: readonly AppendMessageInput[];
}): Promise<void> {
  const conversationId = conversationIdForTarget(options.target);
  if (!conversationId || options.messages.length === 0) return;

  const viewing = isViewingConversation(conversationId);
  const state = readChatState();
  const { threads, appended } = appendMessagesToConversation(
    state.threads,
    options.target,
    options.messages,
    { bumpUnread: !viewing },
  );
  patchChatState({ threads }, "send-conversation-messages");
  if (appended.length > 0) {
    emitChatBus({ type: "messages-appended", conversationId, messages: appended });
  }
  syncChatDesktopBadge();
}

export async function sendFriendMessages(options: {
  friendCharacterId: string;
  messages: readonly AppendMessageInput[];
}): Promise<void> {
  await sendConversationMessages({
    target: {
      kind: "direct",
      friendCharacterId: options.friendCharacterId.trim(),
    },
    messages: options.messages,
  });
}

export async function sendGroupMessages(options: {
  groupId: string;
  senderCharacterId: string;
  messages: readonly AppendMessageInput[];
}): Promise<void> {
  const groupId = options.groupId.trim();
  const senderCharacterId = options.senderCharacterId.trim();
  if (!groupId || !senderCharacterId) return;

  const group = getChatGroup(groupId);
  if (group && !group.memberCharacterIds.includes(senderCharacterId)) {
    console.warn(
      `[phone-chat] 群 ${groupId} 收到不在当前成员列表中的发送者 ${senderCharacterId}`,
    );
  }

  await sendConversationMessages({
    target: { kind: "group", groupId },
    messages: options.messages.map((message) => ({
      ...message,
      ...(message.direction === "incoming" ? { senderCharacterId } : {}),
    })),
  });
}

export async function awaitConversationReply(
  ctx: ExtensionContext,
  options: {
    target: ChatConversationTarget;
    replies: readonly ChatReplyOption[];
    outgoingStatus: ChatMessageStatus;
    allowWait: boolean;
    waitForReply?: boolean;
    onPendingWritten?: () => void | Promise<void>;
  },
): Promise<void> {
  const conversationId = conversationIdForTarget(options.target);
  if (!conversationId || options.replies.length === 0) return;

  settleReplacedPending(ctx, conversationId);
  const basePending: ChatPendingReplies = {
    ...pendingFields(options.target),
    options: options.replies.map((reply) => ({
      ...reply,
      effects: reply.effects.map((effect) => ({ ...effect })),
    })),
    outgoingStatus: options.outgoingStatus,
  };

  if (!options.allowWait) {
    const first = options.replies[0];
    if (!first) return;
    upsertPendingReplies(basePending);
    selectPlayerReply(ctx, first.id, conversationId);
    return;
  }

  const waitForReply = options.waitForReply !== false;
  if (!waitForReply) {
    upsertPendingReplies(basePending);
    emitChatBus({ type: "replies-changed", conversationId });
    return;
  }

  const wait = createReplyWait(conversationId, ctx.flow.signal);
  upsertPendingReplies({ ...basePending, waitToken: wait.token });
  emitChatBus({ type: "replies-changed", conversationId });

  try {
    if (options.onPendingWritten) await options.onPendingWritten();
  } catch (error) {
    removePendingReplies(conversationId);
    resolveReplyWait(wait.token);
    emitChatBus({ type: "replies-changed", conversationId });
    throw error;
  }
  await wait.promise;
  if (ctx.flow.signal.aborted) {
    removePendingReplies(conversationId);
    emitChatBus({ type: "replies-changed", conversationId });
  }
}

export async function awaitPlayerReply(
  ctx: ExtensionContext,
  options: {
    friendCharacterId: string;
    replies: readonly ChatReplyOption[];
    outgoingStatus: ChatMessageStatus;
    allowWait: boolean;
    waitForReply?: boolean;
    onPendingWritten?: () => void | Promise<void>;
  },
): Promise<void> {
  await awaitConversationReply(ctx, {
    ...options,
    target: {
      kind: "direct",
      friendCharacterId: options.friendCharacterId.trim(),
    },
  });
}

export async function awaitGroupReply(
  ctx: ExtensionContext,
  options: {
    groupId: string;
    replies: readonly ChatReplyOption[];
    outgoingStatus: ChatMessageStatus;
    allowWait: boolean;
    waitForReply?: boolean;
    onPendingWritten?: () => void | Promise<void>;
  },
): Promise<void> {
  await awaitConversationReply(ctx, {
    ...options,
    target: { kind: "group", groupId: options.groupId.trim() },
  });
}

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

export function removeFriend(characterId: string): void {
  const id = characterId.trim();
  if (!id) return;
  const state = readChatState();
  const friendsExtra = state.friendsExtra.filter((item) => item !== id);
  const friendsRemoved = state.friendsRemoved.includes(id)
    ? state.friendsRemoved
    : [...state.friendsRemoved, id];
  const conversationId = directConversationId(id);
  const pendingReplies = state.pendingReplies.filter(
    (pending) => conversationIdForPending(pending) !== conversationId,
  );
  resolveReplyWaitsForConversation(conversationId);
  patchChatState(
    { friendsExtra, friendsRemoved, pendingReplies },
    "remove-friend",
  );
  emitChatBus({ type: "replies-changed", conversationId });
}

export function selectPlayerReply(
  ctx: ExtensionContext,
  replyId: string,
  conversationId?: string,
): boolean {
  const state = readChatState();
  const requestedId = conversationId?.trim();
  const pendingIndex = state.pendingReplies.findIndex((pending) => {
    if (requestedId && conversationIdForPending(pending) !== requestedId) {
      return false;
    }
    return pending.options.some((option) => option.id === replyId);
  });
  if (pendingIndex < 0) return false;

  const pending = state.pendingReplies[pendingIndex]!;
  const option = pending.options.find((item) => item.id === replyId);
  const targetId = conversationIdForPending(pending);
  const target = parseConversationId(targetId);
  if (!option || !target) return false;

  const viewing = isViewingConversation(targetId);
  const { threads, appended } = appendMessagesToConversation(
    state.threads,
    target,
    [
      {
        text: option.contentType === "image" ? "" : option.text,
        contentType: option.contentType ?? "text",
        ...(option.imageAsset ? { imageAsset: option.imageAsset } : {}),
        direction: "outgoing",
        status: pending.outgoingStatus ?? "read",
      },
    ],
    { bumpUnread: false },
  );
  const nextThreads = viewing
    ? clearConversationUnread(threads, targetId)
    : threads;
  const pendingReplies = state.pendingReplies.filter(
    (_, index) => index !== pendingIndex,
  );

  patchChatState(
    { threads: nextThreads, pendingReplies },
    "select-reply",
  );
  resolveReplyWait(pending.waitToken);
  applyReplyEffects(ctx, option.effects);

  if (appended.length > 0) {
    emitChatBus({
      type: "messages-appended",
      conversationId: targetId,
      messages: appended,
    });
  }
  emitChatBus({ type: "replies-changed", conversationId: targetId });
  syncChatDesktopBadge();
  return true;
}

export function markConversationOpened(conversationId: string): void {
  const id = conversationId.trim();
  if (!parseConversationId(id)) return;
  const threads = clearConversationUnread(readChatState().threads, id);
  patchChatState({ threads }, "open-chat");
  syncChatDesktopBadge();
}

export function markChatOpened(friendCharacterId: string): void {
  markConversationOpened(directConversationId(friendCharacterId));
}

export function listVisibleFriendIds(): string[] {
  const settings = getCachedAuthorSettings();
  const state = readChatState();
  return resolveFriendIds(
    settings.defaultFriends,
    state.friendsExtra,
    state.friendsRemoved,
  );
}

export function listChatGroups(): ChatGroupDefinition[] {
  const settings = getCachedAuthorSettings();
  return resolveGroupDefinitions(
    settings.defaultGroups,
    readChatState().groupMemberOverrides,
  );
}

export function getChatGroup(groupId: string): ChatGroupDefinition | undefined {
  return findGroupDefinition(listChatGroups(), groupId);
}

/** 将角色加入作者已定义的群聊；重复加入为无操作。 */
export function joinGroupMember(
  groupId: string,
  characterId: string,
): boolean {
  return updateGroupMember(groupId, characterId, true);
}

/** 将角色移出作者已定义的群聊；重复退出为无操作。 */
export function leaveGroupMember(
  groupId: string,
  characterId: string,
): boolean {
  return updateGroupMember(groupId, characterId, false);
}

function updateGroupMember(
  rawGroupId: string,
  rawCharacterId: string,
  shouldJoin: boolean,
): boolean {
  const groupId = rawGroupId.trim();
  const characterId = rawCharacterId.trim();
  if (!groupId || !characterId) return false;

  const authoredGroup = findGroupDefinition(
    getCachedAuthorSettings().defaultGroups,
    groupId,
  );
  if (!authoredGroup) {
    console.warn(`[phone-chat] 找不到群聊 ${groupId}，成员变更已忽略`);
    return false;
  }

  const currentGroup = getChatGroup(groupId);
  const isMember = Boolean(
    currentGroup?.memberCharacterIds.includes(characterId),
  );
  if (isMember === shouldJoin) return false;

  const state = readChatState();
  const existing = state.groupMemberOverrides.find(
    (item) => item.groupId === groupId,
  );
  const added = new Set(existing?.addedCharacterIds ?? []);
  const removed = new Set(existing?.removedCharacterIds ?? []);
  const isAuthoredMember = authoredGroup.memberCharacterIds.includes(characterId);

  if (shouldJoin) {
    removed.delete(characterId);
    if (!isAuthoredMember) added.add(characterId);
  } else {
    added.delete(characterId);
    if (isAuthoredMember) removed.add(characterId);
    else removed.delete(characterId);
  }

  const nextOverride: ChatGroupMemberOverride = {
    groupId,
    addedCharacterIds: [...added],
    removedCharacterIds: [...removed],
  };
  const groupMemberOverrides = state.groupMemberOverrides.filter(
    (item) => item.groupId !== groupId,
  );
  if (
    nextOverride.addedCharacterIds.length > 0 ||
    nextOverride.removedCharacterIds.length > 0
  ) {
    groupMemberOverrides.push(nextOverride);
  }

  patchChatState(
    { groupMemberOverrides },
    shouldJoin ? "join-group-member" : "leave-group-member",
  );
  return true;
}

export function currentOpenConversationId(): string | null {
  return getOpenConversationId();
}

export function currentOpenChatFriendId(): string | null {
  const target = parseConversationId(getOpenConversationId() ?? "");
  return target?.kind === "direct" ? target.friendCharacterId : null;
}

export function groupConversationKey(groupId: string): string {
  return groupConversationId(groupId);
}
