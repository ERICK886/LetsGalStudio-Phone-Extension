/**
 * @file chat-friends-bridge.ts
 * @description 编辑器：读写 phone-chat.defaultFriends。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import {
  readModuleSetting,
  writeModuleSetting,
} from "../schema/section-settings-bridge";
import { CHAT_SETTINGS_MODULE_ID } from "../schema/chat-app-editor-schema";

/** 可编辑默认好友行。 */
export interface EditableChatFriend {
  /** 稳定行键（编辑器用，不写入 settings） */
  uid: string;
  /** 角色资产 ID */
  characterId: string;
}

/**
 * 生成行 uid。
 *
 * @returns uid
 */
function nextUid(): string {
  return `friend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 规范化一行。
 *
 * @param raw - 原始元素
 * @returns 行或 null
 */
function normalizeRow(raw: unknown): EditableChatFriend | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const characterId =
    typeof row.characterId === "string" ? row.characterId.trim() : "";
  if (!characterId) return null;
  return { uid: nextUid(), characterId: characterId.slice(0, 128) };
}

/**
 * 读取默认好友列表。
 *
 * @param ctx - 扩展上下文
 * @returns 好友行
 */
export function readEditableChatFriends(
  ctx: ExtensionContext,
): EditableChatFriend[] {
  const raw = readModuleSetting(ctx, CHAT_SETTINGS_MODULE_ID, "defaultFriends");
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const rows: EditableChatFriend[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 80)) {
    const row = normalizeRow(item);
    if (!row || seen.has(row.characterId)) continue;
    seen.add(row.characterId);
    rows.push(row);
  }
  return rows;
}

/**
 * 写入 defaultFriends（仅 characterId）。
 *
 * @param ctx - 扩展上下文
 * @param friends - 好友行
 * @returns 是否成功
 */
export function writeEditableChatFriends(
  ctx: ExtensionContext,
  friends: readonly EditableChatFriend[],
): boolean {
  const seen = new Set<string>();
  const payload: Array<{ characterId: string }> = [];
  for (const friend of friends.slice(0, 80)) {
    const id = friend.characterId.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    payload.push({ characterId: id.slice(0, 128) });
  }
  return writeModuleSetting(ctx, CHAT_SETTINGS_MODULE_ID, "defaultFriends", payload);
}

/**
 * 创建空白好友行（带占位 characterId，避免无法落盘）。
 *
 * @param existingCharacterIds - 已有角色 id
 * @returns 新行
 */
export function createBlankChatFriend(
  existingCharacterIds: ReadonlySet<string> = new Set(),
): EditableChatFriend {
  let characterId = "new-friend";
  if (existingCharacterIds.has(characterId)) {
    for (let i = 2; i < 1000; i += 1) {
      const candidate = `new-friend-${i}`;
      if (!existingCharacterIds.has(candidate)) {
        characterId = candidate;
        break;
      }
    }
  }
  return { uid: nextUid(), characterId };
}
