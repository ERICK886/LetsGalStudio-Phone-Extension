/**
 * @file store.ts
 * @description 绑定本模块 save，供方法与内页 UI 读写会话状态。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * `pendingReplies` 按会话存储为 list；旧存档的 0～1 项结构可直接读取。
 * 多模块下存档键与逻辑名一致（无 chat 前缀）。
 */

import type { SaveAPI } from "@avg-studio/sdk";
import type {
  ChatGroupMemberOverride,
  ChatMessage,
  ChatMessageStatus,
  ChatPendingReplies,
  ChatReplyOption,
  ChatSaveState,
  ChatThread,
} from "../types/index";
import { normalizeGroupMemberOverrides } from "../domain/groups";
import { emitChatBus } from "./bus";

/**
 * 与 `defineSave` 对齐的存档字段映射。
 */
export type ChatSaveMap = {
  friendsExtra: string[];
  friendsRemoved: string[];
  groupMemberOverrides: ChatGroupMemberOverride[];
  threads: ChatThread[];
  pendingReplies: ChatPendingReplies[];
};

type ChatSaveApi = SaveAPI<ChatSaveMap>;

let saveApi: ChatSaveApi | null = null;

/** save 未绑定时的内存兜底。 */
let memoryState: ChatSaveState = {
  friendsExtra: [],
  friendsRemoved: [],
  groupMemberOverrides: [],
  threads: [],
  pendingReplies: [],
};

/**
 * 绑定本模块 `this.save`。
 *
 * @param api - this.save 或兼容适配器
 */
export function bindChatSave(api: ChatSaveApi | SaveAPI<any>): void {
  saveApi = api as ChatSaveApi;
  const fromSave = readFromApi(saveApi);
  const saveEmpty =
    fromSave.friendsExtra.length === 0 &&
    fromSave.friendsRemoved.length === 0 &&
    fromSave.groupMemberOverrides.length === 0 &&
    fromSave.threads.length === 0 &&
    fromSave.pendingReplies.length === 0;
  const memoryDirty =
    memoryState.friendsExtra.length > 0 ||
    memoryState.friendsRemoved.length > 0 ||
    memoryState.groupMemberOverrides.length > 0 ||
    memoryState.threads.length > 0 ||
    memoryState.pendingReplies.length > 0;

  if (saveEmpty && memoryDirty) {
    writeToApi(saveApi, memoryState);
  } else {
    memoryState = fromSave;
  }
}

/**
 * @returns 是否已绑定 save
 */
export function hasChatSave(): boolean {
  return saveApi !== null;
}

/**
 * 读取完整存档快照（只读拷贝）。
 *
 * @returns ChatSaveState
 */
export function readChatState(): ChatSaveState {
  if (!saveApi) {
    return cloneState(memoryState);
  }
  const next = readFromApi(saveApi);
  memoryState = next;
  return cloneState(next);
}

/**
 * 写入部分存档字段并广播 state-changed。
 *
 * @param patch - 局部更新
 * @param reason - 调试用原因
 * @returns 合并后的完整状态
 */
export function patchChatState(
  patch: Partial<ChatSaveState>,
  reason: string,
): ChatSaveState {
  const prev = readChatState();
  const next: ChatSaveState = {
    friendsExtra: patch.friendsExtra
      ? [...patch.friendsExtra]
      : prev.friendsExtra,
    friendsRemoved: patch.friendsRemoved
      ? [...patch.friendsRemoved]
      : prev.friendsRemoved,
    groupMemberOverrides: patch.groupMemberOverrides
      ? normalizeGroupMemberOverrides(patch.groupMemberOverrides)
      : prev.groupMemberOverrides,
    threads: patch.threads ? patch.threads.map(cloneThread) : prev.threads,
    pendingReplies: patch.pendingReplies
      ? patch.pendingReplies.map(clonePendingReplies)
      : prev.pendingReplies,
  };

  memoryState = next;
  if (saveApi) {
    writeToApi(saveApi, next);
  }

  emitChatBus({ type: "state-changed", reason });
  return cloneState(next);
}

function readFromApi(api: ChatSaveApi): ChatSaveState {
  const friendExtraList = api.get("friendsExtra");
  const friendRemovedList = api.get("friendsRemoved");
  const groupMemberOverrideList = api.get("groupMemberOverrides");
  const threadList = api.get("threads");
  const pendingList = api.get("pendingReplies");
  return {
    friendsExtra: normalizeStringList(friendExtraList),
    friendsRemoved: normalizeStringList(friendRemovedList),
    groupMemberOverrides: normalizeGroupMemberOverrides(
      Array.isArray(groupMemberOverrideList) ? groupMemberOverrideList : [],
    ),
    threads: (Array.isArray(threadList) ? threadList : [])
      .filter((thread): thread is ChatThread => Boolean(thread && typeof thread === "object"))
      .map(cloneThread),
    pendingReplies: (Array.isArray(pendingList) ? pendingList : [])
      .filter(
        (pending): pending is ChatPendingReplies =>
          Boolean(pending && typeof pending === "object"),
      )
      .map(clonePendingReplies),
  };
}

function writeToApi(api: ChatSaveApi, state: ChatSaveState): void {
  api.set("friendsExtra", [...state.friendsExtra]);
  api.set("friendsRemoved", [...state.friendsRemoved]);
  api.set(
    "groupMemberOverrides",
    state.groupMemberOverrides.map(cloneGroupMemberOverride),
  );
  api.set(
    "threads",
    state.threads.map(cloneThread),
  );
  api.set(
    "pendingReplies",
    state.pendingReplies.map(clonePendingReplies),
  );
}

function cloneState(state: ChatSaveState): ChatSaveState {
  return {
    friendsExtra: [...state.friendsExtra],
    friendsRemoved: [...state.friendsRemoved],
    groupMemberOverrides: state.groupMemberOverrides.map(cloneGroupMemberOverride),
    threads: state.threads.map(cloneThread),
    pendingReplies: state.pendingReplies.map(clonePendingReplies),
  };
}

function cloneGroupMemberOverride(
  item: ChatGroupMemberOverride,
): ChatGroupMemberOverride {
  return {
    groupId: item.groupId,
    addedCharacterIds: [...item.addedCharacterIds],
    removedCharacterIds: [...item.removedCharacterIds],
  };
}

function cloneThread(thread: ChatThread): ChatThread {
  const groupId = String(thread.groupId ?? "").trim();
  const isGroup = thread.kind === "group" || Boolean(groupId);
  return {
    ...thread,
    kind: isGroup ? "group" : "direct",
    friendCharacterId: isGroup
      ? ""
      : String(thread.friendCharacterId ?? "").trim(),
    ...(groupId ? { groupId } : {}),
    messages: Array.isArray(thread.messages)
      ? thread.messages
          .filter((message) => Boolean(message && typeof message === "object"))
          .map(cloneMessage)
      : [],
    updatedAt: Number.isFinite(Number(thread.updatedAt))
      ? Number(thread.updatedAt)
      : 0,
    unreadCount: Math.max(0, Math.trunc(Number(thread.unreadCount) || 0)),
  };
}

const MESSAGE_STATUSES = new Set<ChatMessageStatus>([
  "sending",
  "unread",
  "read",
  "failed",
  "blocked",
]);

function cloneMessage(message: ChatMessage): ChatMessage {
  const rawStatus = String(message.status ?? "read") as ChatMessageStatus;
  const senderCharacterId = String(message.senderCharacterId ?? "").trim();
  const imageAsset = String(message.imageAsset ?? "").trim();
  return {
    id: String(message.id ?? ""),
    text: String(message.text ?? ""),
    direction: message.direction === "outgoing" ? "outgoing" : "incoming",
    status: MESSAGE_STATUSES.has(rawStatus) ? rawStatus : "read",
    createdAt: Number.isFinite(Number(message.createdAt))
      ? Number(message.createdAt)
      : 0,
    contentType: message.contentType === "image" ? "image" : "text",
    ...(imageAsset ? { imageAsset } : {}),
    ...(senderCharacterId ? { senderCharacterId } : {}),
  };
}

function clonePendingReplies(pending: ChatPendingReplies): ChatPendingReplies {
  const conversationId = String(pending.conversationId ?? "").trim();
  const groupId = String(pending.groupId ?? "").trim();
  const waitToken = String(pending.waitToken ?? "").trim();
  const rawStatus = String(pending.outgoingStatus ?? "read") as ChatMessageStatus;
  return {
    ...(conversationId ? { conversationId } : {}),
    friendCharacterId: String(pending.friendCharacterId ?? "").trim(),
    ...(groupId ? { groupId } : {}),
    options: Array.isArray(pending.options)
      ? pending.options
          .filter((option) => Boolean(option && typeof option === "object"))
          .map(cloneReplyOption)
      : [],
    ...(waitToken ? { waitToken } : {}),
    outgoingStatus: MESSAGE_STATUSES.has(rawStatus) ? rawStatus : "read",
  };
}

function cloneReplyOption(option: ChatReplyOption): ChatReplyOption {
  const imageAsset = String(option.imageAsset ?? "").trim();
  return {
    id: String(option.id ?? ""),
    text: String(option.text ?? ""),
    effects: Array.isArray(option.effects)
      ? option.effects
          .filter((effect) => Boolean(effect && typeof effect === "object"))
          .map((effect) => ({
            variable: String(effect.variable ?? "").trim(),
            value: String(effect.value ?? ""),
          }))
      : [],
    contentType: option.contentType === "image" ? "image" : "text",
    ...(imageAsset ? { imageAsset } : {}),
  };
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    const text = String(item ?? "").trim();
    if (text && !result.includes(text)) result.push(text);
  }
  return result;
}
