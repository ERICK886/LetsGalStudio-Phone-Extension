/**
 * @file save-fields.ts
 * @description 聊天内页存档字段定义（带 `chat` 前缀），供宿主
 *              `StudioPhoneExtension` 在 `static saveSchema` 中合并。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 字段名一律以 `chat` 前缀（如 `chatThreads`、`chatPendingReplies`），
 *   避免与宿主手机壳存档（`preferences`、`appAvailability`）或将来迁入的相册冲突。
 * - `runtime/store.ts` 的 `bindChatSave` 通过键映射适配器把逻辑名
 *   （`friendsExtra` 等）翻译为这些 `chat*` 存档键。
 * - 类型与 `defineSave` 一致：`type`/`persistence`/`default`/`label`。
 */

import type { SaveSchema } from "@avg-studio/sdk";

import type { ChatPendingReplies, ChatThread } from "./types/index";

/**
 * 聊天内页存档字段（带 `chat` 前缀）。
 *
 * @remarks
 * 由宿主在 `static saveSchema = defineSave({ ...phoneHostSaveSchema, ...chatSaveSchemaFields })`
 * 中合并；运行时 `this.save.get("chatThreads")` 等由 store 适配器代为访问。
 */
export const chatSaveSchemaFields = {
  chatFriendsExtra: {
    type: "list",
    persistence: "slot",
    default: [] as string[],
    label: "动态添加的好友",
  },
  chatFriendsRemoved: {
    type: "list",
    persistence: "slot",
    default: [] as string[],
    label: "动态隐藏的好友",
  },
  chatThreads: {
    type: "list",
    persistence: "slot",
    default: [] as ChatThread[],
    label: "聊天会话线程",
  },
  chatPendingReplies: {
    type: "list",
    persistence: "slot",
    default: [] as ChatPendingReplies[],
    label: "当前可选玩家回复",
  },
} as const satisfies SaveSchema;

/**
 * 逻辑存档名 → `chat` 前缀存档键的映射。
 *
 * @remarks
 * `runtime/store.ts` 的 `bindChatSave` 用它构造键映射适配器，使领域层
 * （`actions.ts` 等）继续使用逻辑名 `friendsExtra` / `threads` 等，
 * 而实际读写落到宿主 save 的 `chat*` 键上。
 */
export const CHAT_SAVE_KEY_MAP = {
  friendsExtra: "chatFriendsExtra",
  friendsRemoved: "chatFriendsRemoved",
  threads: "chatThreads",
  pendingReplies: "chatPendingReplies",
} as const;

/** 逻辑存档键集合（用于类型约束与遍历）。 */
export type ChatSaveLogicalKey = keyof typeof CHAT_SAVE_KEY_MAP;
