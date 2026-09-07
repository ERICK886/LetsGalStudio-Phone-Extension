/**
 * @file save-fields.ts
 * @description 聊天模块存档字段（本模块独立 saveSchema，无需 chat 前缀）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import type { SaveSchema } from "@avg-studio/sdk";

import type {
  ChatGroupMemberOverride,
  ChatPendingReplies,
  ChatThread,
} from "./types/index";

/**
 * 聊天模块存档字段，供 `ChatController.static saveSchema = defineSave(…)` 使用。
 */
export const chatSaveSchemaFields = {
  friendsExtra: {
    type: "list",
    persistence: "slot",
    default: [] as string[],
    label: "动态添加的好友",
  },
  friendsRemoved: {
    type: "list",
    persistence: "slot",
    default: [] as string[],
    label: "动态隐藏的好友",
  },
  groupMemberOverrides: {
    type: "list",
    persistence: "slot",
    default: [] as ChatGroupMemberOverride[],
    label: "群聊动态成员变更",
  },
  threads: {
    type: "list",
    persistence: "slot",
    default: [] as ChatThread[],
    label: "聊天会话线程",
  },
  pendingReplies: {
    type: "list",
    persistence: "slot",
    default: [] as ChatPendingReplies[],
    label: "各会话当前可选玩家回复",
  },
} as const satisfies SaveSchema;
