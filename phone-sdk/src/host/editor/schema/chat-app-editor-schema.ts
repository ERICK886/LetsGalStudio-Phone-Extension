/**
 * @file chat-app-editor-schema.ts
 * @description 「聊天APP」分区编辑 schema（仅内页文案 / 默认好友 / 属性槽）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 *
 * @remarks
 * 消息手机相关的 `chatRolePresets` / `chatAvatarAssets` /
 * `markOutgoingUnreadReadBeforeIncoming` 归属宿主「手机」分区，不在此声明。
 */

import type {
  PhoneEditorContentItemSchema,
  PhoneEditorPageSchema,
  PhoneEditorSectionSchema,
} from "../../../client/runtime/types";

/** 聊天模块 id（与 `@extension({ id: "phone-chat" })` 一致）。 */
export const CHAT_SETTINGS_MODULE_ID = "phone-chat";

/** 宿主手机模块 id（供 bridge / 跨模块字段引用）。 */
export const PHONE_SETTINGS_MODULE_ID = "phone";

/**
 * 聊天分区 contentItems（标量字段；数组页由专用 bridge 管理）。
 */
export const CHAT_APP_CONTENT_ITEMS: readonly PhoneEditorContentItemSchema[] = [
  {
    id: "appTitle",
    group: "文案",
    label: "应用标题",
    icon: "heading",
    fieldType: "string",
    defaultValue: "聊天",
  },
  {
    id: "chatsTabLabel",
    group: "文案",
    label: "聊天 Tab 名称",
    icon: "comments",
    fieldType: "string",
    defaultValue: "聊天",
  },
  {
    id: "friendsTabLabel",
    group: "文案",
    label: "好友 Tab 名称",
    icon: "user-group",
    fieldType: "string",
    defaultValue: "好友",
  },
  {
    id: "emptyChatsHint",
    group: "文案",
    label: "聊天列表空提示",
    icon: "comment-slash",
    fieldType: "string",
    defaultValue: "暂无聊天，剧情推送消息后会出现在这里",
  },
  {
    id: "emptyFriendsHint",
    group: "文案",
    label: "好友列表空提示",
    icon: "user-slash",
    fieldType: "string",
    defaultValue: "暂无好友，请在扩展设置添加默认好友或用方法添加",
  },
];

const COPY_IDS = [
  "appTitle",
  "chatsTabLabel",
  "friendsTabLabel",
  "emptyChatsHint",
  "emptyFriendsHint",
] as const;

/**
 * 聊天分区页面列表（不含消息手机字段）。
 */
export const CHAT_APP_EDITOR_PAGES: readonly PhoneEditorPageSchema[] = [
  {
    id: "chat-copy",
    label: "文案与标签",
    icon: "font",
    order: 10,
    status: "ready",
    contentItemIds: [...COPY_IDS],
    preview: "chat",
  },
  {
    id: "chat-friends",
    label: "默认好友",
    icon: "address-book",
    order: 20,
    status: "ready",
    preview: "chat",
  },
  {
    id: "chat-attributes",
    label: "好友属性槽",
    icon: "list",
    order: 30,
    status: "ready",
    preview: "chat",
  },
];

/**
 * 「聊天APP」完整分区 schema。
 */
export const CHAT_APP_EDITOR_SCHEMA: PhoneEditorSectionSchema = {
  sectionId: "phone-chat",
  settingsModuleId: CHAT_SETTINGS_MODULE_ID,
  contentItems: [...CHAT_APP_CONTENT_ITEMS],
  pages: [...CHAT_APP_EDITOR_PAGES],
};
