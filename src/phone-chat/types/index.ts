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
  /** 群聊 incoming 消息的发送者角色 ID；单聊与 outgoing 可省略。 */
  senderCharacterId?: string;
}

export type ChatThreadKind = "direct" | "group";

export interface ChatThread {
  /** 旧存档缺省时按 direct 处理。 */
  kind?: ChatThreadKind;
  /** 单聊对方角色 ID；群聊为空字符串。 */
  friendCharacterId: string;
  /** 群聊稳定 ID；direct 线程省略。 */
  groupId?: string;
  messages: ChatMessage[];
  updatedAt: number;
  unreadCount: number;
}

/** 作者设置中的群聊定义。 */
export interface ChatGroupDefinition {
  id: string;
  title: string;
  avatarAsset?: string;
  memberCharacterIds: string[];
}

/** 相对作者群聊定义的动态成员增删，随存档保存。 */
export interface ChatGroupMemberOverride {
  groupId: string;
  addedCharacterIds: string[];
  removedCharacterIds: string[];
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
  /** 新存档统一会话键；旧存档可由 friendCharacterId 推导。 */
  conversationId?: string;
  friendCharacterId: string;
  groupId?: string;
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
  groupMemberOverrides: ChatGroupMemberOverride[];
  threads: ChatThread[];
  pendingReplies: ChatPendingReplies[];
}

export type ChatTab = "chats" | "friends";

export type ChatScreen =
  | { kind: "tabs"; tab: ChatTab }
  | { kind: "chat"; conversationId: string }
  | { kind: "friend-detail"; friendCharacterId: string };
