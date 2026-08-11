/**
 * @file chat-role-presets-bridge.ts
 * @description 编辑器：读写 phone.chatRolePresets / chatAvatarAssets。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import {
  DEFAULT_CHAT_ROLE_BUBBLE_COLOR,
  DEFAULT_CHAT_ROLE_FONT_SIZE,
  DEFAULT_CHAT_ROLE_NAME_COLOR,
  DEFAULT_CHAT_ROLE_TEXT_COLOR,
} from "../../phone/extension/chat-role-bubble-style";
import {
  readModuleSetting,
  writeModuleSetting,
} from "../schema/section-settings-bridge";
import { PHONE_SETTINGS_MODULE_ID } from "../schema/chat-app-editor-schema";

/** 头像来源。 */
export type ChatAvatarSource =
  | "first-portrait"
  | "character-avatar"
  | "asset";

/** 可编辑角色预设。 */
export interface EditableChatRolePreset {
  id: string;
  characterId: string;
  avatarSource: ChatAvatarSource;
  avatarAssetId: string;
  showAvatar: boolean;
  showName: boolean;
  fontSize: string;
  textColor: string;
  nameColor: string;
  bubbleColor: string;
  customCss: string;
}

/** 可编辑头像素材库行。 */
export interface EditableChatAvatarAsset {
  id: string;
  /** 素材 URI / 资产引用字符串 */
  asset: string;
}

const AVATAR_SOURCES = new Set<ChatAvatarSource>([
  "first-portrait",
  "character-avatar",
  "asset",
]);

/**
 * @param value - 未知值
 * @returns 合法来源
 */
function normalizeAvatarSource(value: unknown): ChatAvatarSource {
  return typeof value === "string" && AVATAR_SOURCES.has(value as ChatAvatarSource)
    ? (value as ChatAvatarSource)
    : "first-portrait";
}

/**
 * 规范化预设行。
 *
 * @param raw - 原始
 * @returns 行或 null
 */
function normalizePreset(raw: unknown): EditableChatRolePreset | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!id) return null;
  return {
    id: id.slice(0, 64),
    characterId:
      typeof row.characterId === "string" ? row.characterId.trim().slice(0, 128) : "",
    avatarSource: normalizeAvatarSource(row.avatarSource),
    avatarAssetId:
      typeof row.avatarAssetId === "string"
        ? row.avatarAssetId.trim().slice(0, 128)
        : "",
    showAvatar: row.showAvatar !== false,
    showName: row.showName !== false,
    fontSize:
      typeof row.fontSize === "string" && row.fontSize.trim()
        ? row.fontSize.trim().slice(0, 32)
        : DEFAULT_CHAT_ROLE_FONT_SIZE,
    textColor:
      typeof row.textColor === "string" && row.textColor.trim()
        ? row.textColor.trim().slice(0, 64)
        : DEFAULT_CHAT_ROLE_TEXT_COLOR,
    nameColor:
      typeof row.nameColor === "string" && row.nameColor.trim()
        ? row.nameColor.trim().slice(0, 64)
        : DEFAULT_CHAT_ROLE_NAME_COLOR,
    bubbleColor:
      typeof row.bubbleColor === "string" && row.bubbleColor.trim()
        ? row.bubbleColor.trim().slice(0, 64)
        : DEFAULT_CHAT_ROLE_BUBBLE_COLOR,
    customCss:
      typeof row.customCss === "string" ? row.customCss.slice(0, 2000) : "",
  };
}

/**
 * 规范化头像素材行。
 *
 * @param raw - 原始
 * @returns 行或 null
 */
function normalizeAvatar(raw: unknown): EditableChatAvatarAsset | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!id) return null;
  let asset = "";
  if (typeof row.asset === "string") {
    asset = row.asset;
  } else if (row.asset && typeof row.asset === "object") {
    const a = row.asset as Record<string, unknown>;
    if (typeof a.uri === "string") asset = a.uri;
    else if (typeof a.id === "string") asset = a.id;
  }
  return { id: id.slice(0, 64), asset: asset.slice(0, 512) };
}

/**
 * 读取角色预设。
 *
 * @param ctx - 扩展上下文
 * @returns 预设列表
 */
export function readEditableChatRolePresets(
  ctx: ExtensionContext,
): EditableChatRolePreset[] {
  const raw = readModuleSetting(ctx, PHONE_SETTINGS_MODULE_ID, "chatRolePresets");
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const rows: EditableChatRolePreset[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 80)) {
    const row = normalizePreset(item);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}

/**
 * 写入角色预设。
 *
 * @param ctx - 扩展上下文
 * @param presets - 预设
 * @returns 是否成功
 */
export function writeEditableChatRolePresets(
  ctx: ExtensionContext,
  presets: readonly EditableChatRolePreset[],
): boolean {
  const seen = new Set<string>();
  const payload: EditableChatRolePreset[] = [];
  for (const preset of presets.slice(0, 80)) {
    const id = preset.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    payload.push({
      ...preset,
      id: id.slice(0, 64),
      characterId: preset.characterId.trim().slice(0, 128),
      avatarAssetId: preset.avatarAssetId.trim().slice(0, 128),
    });
  }
  return writeModuleSetting(
    ctx,
    PHONE_SETTINGS_MODULE_ID,
    "chatRolePresets",
    payload,
  );
}

/**
 * 读取头像素材库。
 *
 * @param ctx - 扩展上下文
 * @returns 素材行
 */
export function readEditableChatAvatarAssets(
  ctx: ExtensionContext,
): EditableChatAvatarAsset[] {
  const raw = readModuleSetting(ctx, PHONE_SETTINGS_MODULE_ID, "chatAvatarAssets");
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const rows: EditableChatAvatarAsset[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 80)) {
    const row = normalizeAvatar(item);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}

/**
 * 写入头像素材库。
 *
 * @param ctx - 扩展上下文
 * @param assets - 素材行
 * @returns 是否成功
 */
export function writeEditableChatAvatarAssets(
  ctx: ExtensionContext,
  assets: readonly EditableChatAvatarAsset[],
): boolean {
  const seen = new Set<string>();
  const payload: Array<{ id: string; asset: string }> = [];
  for (const item of assets.slice(0, 80)) {
    const id = item.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    payload.push({ id: id.slice(0, 64), asset: item.asset.trim().slice(0, 512) });
  }
  return writeModuleSetting(
    ctx,
    PHONE_SETTINGS_MODULE_ID,
    "chatAvatarAssets",
    payload,
  );
}

/**
 * @param existing - 已有 id
 * @param base - 基础
 * @returns 新 id
 */
export function nextChatPresetId(
  existing: ReadonlySet<string>,
  base = "new-chat-role",
): string {
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/**
 * 创建空白角色预设。
 *
 * @param existingIds - 已有 id
 * @returns 新预设
 */
export function createBlankChatRolePreset(
  existingIds: ReadonlySet<string>,
): EditableChatRolePreset {
  const id = nextChatPresetId(existingIds);
  return {
    id,
    characterId: "",
    avatarSource: "first-portrait",
    avatarAssetId: "",
    showAvatar: true,
    showName: true,
    fontSize: DEFAULT_CHAT_ROLE_FONT_SIZE,
    textColor: DEFAULT_CHAT_ROLE_TEXT_COLOR,
    nameColor: DEFAULT_CHAT_ROLE_NAME_COLOR,
    bubbleColor: DEFAULT_CHAT_ROLE_BUBBLE_COLOR,
    customCss: "",
  };
}

/**
 * 创建空白头像素材行。
 *
 * @param existingIds - 已有 id
 * @returns 新行
 */
export function createBlankChatAvatarAsset(
  existingIds: ReadonlySet<string>,
): EditableChatAvatarAsset {
  const id = nextChatPresetId(existingIds, "new-chat-avatar");
  return { id, asset: "" };
}
