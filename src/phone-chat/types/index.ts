/**
 * @file index.ts
 * @description 手机聊天扩展领域与导航类型。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.1
 */

/** 与宿主消息手机对齐的状态枚举。 */
export type ChatMessageStatus =
  | "sending"
  | "unread"
  | "read"
  | "failed"
  | "blocked";

export type ChatMessageDirection = "incoming" | "outgoing";

/** 消息正文种类；缺省视为 `"text"`。 */
export type MessageContentType = "text" | "image";

export interface ChatMessage {
  id: string;
  /** text 消息正文；image 消息可为空串。 */
  text: string;
  direction: ChatMessageDirection;
  status: ChatMessageStatus;
  createdAt: number;
  contentType?: MessageContentType;
  /** image 消息时有效，Studio image asset URI。 */
  imageAsset?: string;
}

export interface ChatThread {
  friendCharacterId: string;
  messages: ChatMessage[];
  updatedAt: number;
  unreadCount: number;
}

export interface ChatReplyEffect {
  variable: string;
  value: string;
}

export interface ChatReplyOption {
  id: string;
  /** text 选项文案；image 选项可为空串。 */
  text: string;
  effects: ChatReplyEffect[];
  contentType?: MessageContentType;
  imageAsset?: string;
}

export interface ChatPendingReplies {
  friendCharacterId: string;
  options: ChatReplyOption[];
  /** 非空表示有方法正在 await-player-reply。 */
  waitToken?: string;
  /** 玩家点选后发出的 outgoing 状态；缺省 read。 */
  outgoingStatus?: ChatMessageStatus;
}

export interface ChatAttributeField {
  id: string;
  label: string;
  /** 支持 `{characterId}` 占位。 */
  variableKey: string;
}

export interface ChatSaveState {
  friendsExtra: string[];
  friendsRemoved: string[];
  threads: ChatThread[];
  pendingReplies: ChatPendingReplies | null;
}

export type ChatTab = "chats" | "friends";

export type ChatScreen =
  | { kind: "tabs"; tab: ChatTab }
  | { kind: "chat"; friendCharacterId: string }
  | { kind: "friend-detail"; friendCharacterId: string };
