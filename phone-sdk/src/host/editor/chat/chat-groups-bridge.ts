/**
 * @file chat-groups-bridge.ts
 * @description 编辑器：读写 phone-chat.defaultGroups。
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import { CHAT_SETTINGS_MODULE_ID } from "../schema/chat-app-editor-schema";
import {
  readModuleSetting,
  writeModuleSetting,
} from "../schema/section-settings-bridge";

export interface EditableChatGroup {
  uid: string;
  groupId: string;
  title: string;
  avatarAsset: string;
  memberCharacterIds: string[];
}

export function editableChatGroupUid(groupId: string): string {
  return `group:${groupId.trim()}`;
}

function normalizeRow(raw: unknown): EditableChatGroup | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const groupId = String(row.groupId ?? row.id ?? "").trim().slice(0, 80);
  if (!groupId) return null;
  const memberCharacterIds: string[] = [];
  for (let index = 1; index <= 8; index += 1) {
    const id = String(row[`member${index}`] ?? "").trim().slice(0, 128);
    if (id && !memberCharacterIds.includes(id)) memberCharacterIds.push(id);
  }
  return {
    uid: editableChatGroupUid(groupId),
    groupId,
    title: String(row.title ?? "").trim().slice(0, 80) || groupId,
    avatarAsset: String(row.avatarAsset ?? "").trim(),
    memberCharacterIds,
  };
}

export function readEditableChatGroups(ctx: ExtensionContext): EditableChatGroup[] {
  const raw = readModuleSetting(ctx, CHAT_SETTINGS_MODULE_ID, "defaultGroups");
  if (!Array.isArray(raw)) return [];
  const groups: EditableChatGroup[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 40)) {
    const group = normalizeRow(item);
    if (!group || seen.has(group.groupId)) continue;
    seen.add(group.groupId);
    groups.push(group);
  }
  return groups;
}

export function writeEditableChatGroups(
  ctx: ExtensionContext,
  groups: readonly EditableChatGroup[],
): boolean {
  const payload: Array<Record<string, string>> = [];
  const seen = new Set<string>();
  for (const group of groups.slice(0, 40)) {
    const groupId = group.groupId.trim().slice(0, 80);
    if (!groupId || seen.has(groupId)) continue;
    const row: Record<string, string> = {
      groupId,
      title: group.title.trim().slice(0, 80) || groupId,
      avatarAsset: group.avatarAsset.trim(),
    };
    const members = [...new Set(group.memberCharacterIds.map((id) => id.trim()))]
      .filter(Boolean)
      .slice(0, 8);
    for (let index = 0; index < 8; index += 1) {
      row[`member${index + 1}`] = members[index] ?? "";
    }
    payload.push(row);
    seen.add(groupId);
  }
  return writeModuleSetting(ctx, CHAT_SETTINGS_MODULE_ID, "defaultGroups", payload);
}

export function createBlankChatGroup(
  existingIds: ReadonlySet<string> = new Set(),
): EditableChatGroup {
  let groupId = "group-1";
  for (let index = 2; existingIds.has(groupId) && index < 1000; index += 1) {
    groupId = `group-${index}`;
  }
  return {
    uid: editableChatGroupUid(groupId),
    groupId,
    title: "群聊",
    avatarAsset: "",
    memberCharacterIds: [],
  };
}
