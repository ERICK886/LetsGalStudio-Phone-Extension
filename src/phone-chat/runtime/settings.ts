/**
 * @file settings.ts
 * @description 从本模块设置读取默认好友、属性槽位与文案，并缓存供内页使用。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * 多模块模式下本模块有独立 settings 命名空间，字段无前缀。
 * 内页在宿主 Phone 中渲染时勿直接 settings.get；用 cache + getCached。
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import type { ChatAttributeField } from "../types/index";

/**
 * 作者设置快照（运行时规范化后）。
 */
export interface ChatAuthorSettings {
  selfCharacterId: string;
  defaultFriends: string[];
  attributeFields: ChatAttributeField[];
  chatsTabLabel: string;
  friendsTabLabel: string;
  emptyChatsHint: string;
  emptyFriendsHint: string;
  appTitle: string;
}

const DEFAULTS: ChatAuthorSettings = {
  selfCharacterId: "",
  defaultFriends: [],
  attributeFields: [],
  chatsTabLabel: "聊天",
  friendsTabLabel: "好友",
  emptyChatsHint: "暂无聊天，剧情推送消息后会出现在这里",
  emptyFriendsHint: "暂无好友，请在扩展设置添加默认好友或用方法添加",
  appTitle: "聊天",
};

/** 供 `ChatController.onRegister` 订阅。 */
export const CHAT_SETTINGS_KEYS = [
  "selfCharacterId",
  "defaultFriends",
  "attributeFields",
  "appTitle",
  "chatsTabLabel",
  "friendsTabLabel",
  "emptyChatsHint",
  "emptyFriendsHint",
] as const;

function nonEmpty(value: unknown, fallback: string, max = 40): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

/**
 * 读取并规范化作者设置。
 *
 * @param ctx - 本模块扩展上下文
 * @returns ChatAuthorSettings
 */
export function readAuthorSettings(ctx: ExtensionContext): ChatAuthorSettings {
  const friendRows = ctx.settings.get<unknown[]>("defaultFriends") ?? [];
  const defaultFriends: string[] = [];
  for (const row of friendRows) {
    if (!row || typeof row !== "object") continue;
    const id = String(
      (row as { characterId?: unknown }).characterId ?? "",
    ).trim();
    if (id && !defaultFriends.includes(id)) defaultFriends.push(id);
  }

  const attrRows = ctx.settings.get<unknown[]>("attributeFields") ?? [];
  const attributeFields: ChatAttributeField[] = [];
  for (const row of attrRows) {
    if (!row || typeof row !== "object") continue;
    const raw = row as {
      id?: unknown;
      label?: unknown;
      variableKey?: unknown;
    };
    const id = String(raw.id ?? "").trim();
    const label = String(raw.label ?? "").trim();
    const variableKey = String(raw.variableKey ?? "").trim();
    if (!id || !label || !variableKey) continue;
    attributeFields.push({ id, label, variableKey });
  }

  return {
    selfCharacterId: String(ctx.settings.get("selfCharacterId") ?? "").trim(),
    defaultFriends,
    attributeFields,
    chatsTabLabel: nonEmpty(
      ctx.settings.get("chatsTabLabel"),
      DEFAULTS.chatsTabLabel,
    ),
    friendsTabLabel: nonEmpty(
      ctx.settings.get("friendsTabLabel"),
      DEFAULTS.friendsTabLabel,
    ),
    emptyChatsHint: nonEmpty(
      ctx.settings.get("emptyChatsHint"),
      DEFAULTS.emptyChatsHint,
      120,
    ),
    emptyFriendsHint: nonEmpty(
      ctx.settings.get("emptyFriendsHint"),
      DEFAULTS.emptyFriendsHint,
      120,
    ),
    appTitle: nonEmpty(ctx.settings.get("appTitle"), DEFAULTS.appTitle),
  };
}

let cachedSettings: ChatAuthorSettings = { ...DEFAULTS };

/**
 * 在方法 / onRegister 中缓存设置，供内页 UI 读取。
 *
 * @param settings - 规范化设置
 */
export function cacheAuthorSettings(settings: ChatAuthorSettings): void {
  cachedSettings = {
    ...settings,
    defaultFriends: [...settings.defaultFriends],
    attributeFields: settings.attributeFields.map((field) => ({ ...field })),
  };
}

/**
 * 读取缓存的作者设置（内页用）。
 *
 * @returns ChatAuthorSettings 拷贝
 */
export function getCachedAuthorSettings(): ChatAuthorSettings {
  return {
    ...cachedSettings,
    defaultFriends: [...cachedSettings.defaultFriends],
    attributeFields: cachedSettings.attributeFields.map((field) => ({
      ...field,
    })),
  };
}
