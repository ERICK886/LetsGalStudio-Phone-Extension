/**
 * @file store.ts
 * @description 绑定扩展 save，供方法与内页 UI 读写会话状态。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 *
 * @remarks
 * - `pendingReplies` 在 saveSchema 中以 list（0～1 项）存储，读写时在本模块折叠为对象或 null。
 * - 自 v0.2.0 起，存档键带 `chat` 前缀（`chatFriendsExtra` 等），由 `CHAT_SAVE_KEY_MAP`
 *   通过键映射适配器把逻辑名（`friendsExtra` 等）翻译为实际存档键。领域层
 *   （`actions.ts` / UI）继续使用逻辑名，无感知。
 */

import type { SaveAPI } from "@avg-studio/sdk";
import { CHAT_SAVE_KEY_MAP } from "../save-fields";
import type {
  ChatPendingReplies,
  ChatSaveState,
  ChatThread,
} from "../types/index";
import { emitChatBus } from "./bus";

/**
 * 与领域层逻辑名对齐的存档字段映射。
 *
 * @property friendsExtra - 剧情追加好友
 * @property friendsRemoved - 剧情隐藏的好友
 * @property threads - 会话列表
 * @property pendingReplies - 当前可选回复（最多 1 条记录）
 *
 * @remarks
 * 键名是逻辑名；实际存档键由 `CHAT_SAVE_KEY_MAP` 映射为 `chat*` 前缀。
 */
export type ChatSaveMap = {
  friendsExtra: string[];
  friendsRemoved: string[];
  threads: ChatThread[];
  pendingReplies: ChatPendingReplies[];
};

/**
 * 键映射适配器：把对逻辑名的 `get/set` 翻译为对 `chat*` 前缀键的访问。
 *
 * @remarks
 * - 仅翻译 `ChatSaveMap` 已知的四个逻辑键；其他键直接透传到底层 api（防御性）。
 * - `useValue` 不在 chat 模块使用，但仍按相同规则映射，保持接口完整。
 */
function createKeyMappedApi(
  api: SaveAPI<Record<string, unknown>>,
): SaveAPI<ChatSaveMap> {
  const toSaveKey = (logical: string): string =>
    (CHAT_SAVE_KEY_MAP as Record<string, string>)[logical] ?? logical;

  return {
    get: <K extends keyof ChatSaveMap>(key: K): ChatSaveMap[K] =>
      api.get(toSaveKey(key as string)) as ChatSaveMap[K],
    set: <K extends keyof ChatSaveMap>(key: K, value: ChatSaveMap[K]): void => {
      api.set(toSaveKey(key as string), value as unknown);
    },
    useValue: <K extends keyof ChatSaveMap>(key: K): [ChatSaveMap[K], (v: ChatSaveMap[K]) => void] => {
      const [value, setter] = api.useValue(toSaveKey(key as string)) as [
        unknown,
        (v: unknown) => void,
      ];
      return [value as ChatSaveMap[K], (v: ChatSaveMap[K]) => setter(v as unknown)];
    },
  };
}

type ChatSaveApi = SaveAPI<ChatSaveMap>;

let saveApi: ChatSaveApi | null = null;

/** save 未绑定时的内存兜底（方法执行后会升级为真实 save）。 */
let memoryState: ChatSaveState = {
  friendsExtra: [],
  friendsRemoved: [],
  threads: [],
  pendingReplies: null,
};

/**
 * 绑定 save（兼容 method `this.save` 的条件类型推导）。
 *
 * @param api - this.save 或兼容适配器；键名可为 `chat*` 前缀（由适配器翻译）
 * @returns void
 *
 * @example
 * ```ts
 * bindChatSave(this.save);
 * ```
 *
 * @remarks
 * 入参 `api` 通常是宿主包装类实例的 `this.save`，其键为 `chat*` 前缀；
 * 本函数包一层键映射适配器，使本模块其余代码继续使用逻辑名。
 */
export function bindChatSave(api: ChatSaveApi | SaveAPI<any>): void {
  const mapped = createKeyMappedApi(
    api as SaveAPI<Record<string, unknown>>,
  ) as ChatSaveApi;
  saveApi = mapped;
  // 优先采用存档中的数据；若存档为空而内存有写，则回写，避免 UI 先写后丢。
  const fromSave = readFromApi(mapped);
  const saveEmpty =
    fromSave.friendsExtra.length === 0 &&
    fromSave.friendsRemoved.length === 0 &&
    fromSave.threads.length === 0 &&
    fromSave.pendingReplies === null;
  const memoryDirty =
    memoryState.friendsExtra.length > 0 ||
    memoryState.friendsRemoved.length > 0 ||
    memoryState.threads.length > 0 ||
    memoryState.pendingReplies !== null;

  if (saveEmpty && memoryDirty) {
    writeToApi(mapped, memoryState);
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
    threads: patch.threads ? [...patch.threads] : prev.threads,
    pendingReplies:
      "pendingReplies" in patch
        ? patch.pendingReplies
          ? {
              ...patch.pendingReplies,
              options: [...patch.pendingReplies.options],
            }
          : null
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
  const pendingList = api.get("pendingReplies") ?? [];
  const pending = pendingList[0];
  return {
    friendsExtra: [...(api.get("friendsExtra") ?? [])],
    friendsRemoved: [...(api.get("friendsRemoved") ?? [])],
    threads: [...(api.get("threads") ?? [])].map((thread) => ({
      ...thread,
      messages: [...(thread.messages ?? [])],
    })),
    pendingReplies: pending
      ? { ...pending, options: [...(pending.options ?? [])] }
      : null,
  };
}

function writeToApi(api: ChatSaveApi, state: ChatSaveState): void {
  api.set("friendsExtra", [...state.friendsExtra]);
  api.set("friendsRemoved", [...state.friendsRemoved]);
  api.set(
    "threads",
    state.threads.map((thread) => ({
      ...thread,
      messages: [...thread.messages],
    })),
  );
  api.set(
    "pendingReplies",
    state.pendingReplies
      ? [
          {
            ...state.pendingReplies,
            options: [...state.pendingReplies.options],
          },
        ]
      : [],
  );
}

function cloneState(state: ChatSaveState): ChatSaveState {
  return {
    friendsExtra: [...state.friendsExtra],
    friendsRemoved: [...state.friendsRemoved],
    threads: state.threads.map((thread) => ({
      ...thread,
      messages: [...thread.messages],
    })),
    pendingReplies: state.pendingReplies
      ? {
          ...state.pendingReplies,
          options: [...state.pendingReplies.options],
        }
      : null,
  };
}
