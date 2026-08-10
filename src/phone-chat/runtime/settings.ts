/**
 * @file settings.ts
 * @description 从扩展设置读取默认好友、属性槽位与文案，并缓存供内页使用。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 *
 * @remarks
 * - 字段名一律以 `chat` 前缀读取（与 `settings-fields.ts` 的 `buildChatSettingsFields` 对齐）。
 * - `CHAT_SETTINGS_KEYS` 供宿主包装类 `onRegister` 集中订阅。
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import type { ChatAttributeField } from "../types/index";

/**
 * 作者设置快照（运行时规范化后）。
 *
 * @remarks
 * 字段名沿用逻辑名（不带 `chat` 前缀），供 UI / domain 层无感使用；
 * 前缀仅体现在 `ctx.settings.get` 的 key 上。
 */
export interface ChatAuthorSettings {
  defaultFriends: string[];
  attributeFields: ChatAttributeField[];
  chatsTabLabel: string;
  friendsTabLabel: string;
  emptyChatsHint: string;
  emptyFriendsHint: string;
  appTitle: string;
}

const DEFAULTS: ChatAuthorSettings = {
  defaultFriends: [],
  attributeFields: [],
  chatsTabLabel: "聊天",
  friendsTabLabel: "好友",
  emptyChatsHint: "暂无聊天，剧情推送消息后会出现在这里",
  emptyFriendsHint: "暂无好友，请在扩展设置添加默认好友或用方法添加",
  appTitle: "聊天",
};

/**
 * 聊天内页作者设置键（带 `chat` 前缀）。
 *
 * @remarks
 * 供宿主 `StudioPhoneExtension.onRegister` 集中 `ctx.settings.subscribe`，
 * 任一字段变更即刷新缓存。与 `settings-fields.ts` 的字段名一一对应。
 */
export const CHAT_SETTINGS_KEYS = [
  "chatDefaultFriends",
  "chatAttributeFields",
  "chatAppTitle",
  "chatChatsTabLabel",
  "chatFriendsTabLabel",
  "chatEmptyChatsHint",
  "chatEmptyFriendsHint",
] as const;

function nonEmpty(value: unknown, fallback: string, max = 40): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

/**
 * 读取并规范化作者设置。
 *
 * @param ctx - 扩展上下文（方法内为聊天扩展 scope；内页为宿主 scope 时勿用本函数读设置）
 * @returns ChatAuthorSettings
 *
 * @example
 * ```ts
 * const settings = readAuthorSettings(ctx);
 * ```
 *
 * @remarks
 * 内页 React 树在宿主 Phone 中渲染时，`useExtensionContext()` 是宿主上下文，
 * 不能直接 `settings.get` 本扩展字段；请用 `cacheAuthorSettings` + `getCachedAuthorSettings`。
 */
export function readAuthorSettings(ctx: ExtensionContext): ChatAuthorSettings {
  const friendRows = ctx.settings.get<unknown[]>("chatDefaultFriends") ?? [];
  const defaultFriends: string[] = [];
  for (const row of friendRows) {
    if (!row || typeof row !== "object") continue;
    const id = String(
      (row as { characterId?: unknown }).characterId ?? "",
    ).trim();
    if (id && !defaultFriends.includes(id)) defaultFriends.push(id);
  }

  const attrRows = ctx.settings.get<unknown[]>("chatAttributeFields") ?? [];
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
    defaultFriends,
    attributeFields,
    chatsTabLabel: nonEmpty(
      ctx.settings.get("chatChatsTabLabel"),
      DEFAULTS.chatsTabLabel,
    ),
    friendsTabLabel: nonEmpty(
      ctx.settings.get("chatFriendsTabLabel"),
      DEFAULTS.friendsTabLabel,
    ),
    emptyChatsHint: nonEmpty(
      ctx.settings.get("chatEmptyChatsHint"),
      DEFAULTS.emptyChatsHint,
      120,
    ),
    emptyFriendsHint: nonEmpty(
      ctx.settings.get("chatEmptyFriendsHint"),
      DEFAULTS.emptyFriendsHint,
      120,
    ),
    appTitle: nonEmpty(ctx.settings.get("chatAppTitle"), DEFAULTS.appTitle),
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
