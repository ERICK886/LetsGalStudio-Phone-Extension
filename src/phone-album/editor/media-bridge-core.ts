/**
 * @file media-bridge-core.ts
 * @description 默认媒体 bridge 纯函数（无 phone-sdk 依赖，便于 node:test）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import type { MediaType } from "../types.ts";

/** 解析逗号分隔 albumIds（与 domain/parse 一致）。 */
function parseCommaIds(raw: unknown): string[] {
  const text = typeof raw === "string" ? raw : String(raw ?? "");
  if (text.trim() === "") return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[,，]/)) {
    const id = part.trim();
    if (id === "" || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** 解析媒体类型（与 domain/parse 一致）。 */
function parseMediaType(raw: unknown): MediaType | null {
  if (typeof raw !== "string") return null;
  const v = raw.toLowerCase();
  if (v === "image" || v === "video") return v;
  return null;
}

/** 可编辑默认媒体行。 */
export interface EditableDefaultMedia {
  /** 稳定行键（编辑器用，不写入 settings） */
  uid: string;
  /** 媒体 ID */
  id: string;
  /** 媒体类型 */
  type: MediaType;
  /** 素材 URI（空白行 write 时过滤） */
  asset: string;
  /** 所属相册 id（写入时 join 为逗号串） */
  albumIds: string[];
  /** 视频时长秒；0 表示未设 */
  durationSec: number;
  /** 视频封面（可为空） */
  posterAsset: string;
}

/** settings 写入 payload 元素。 */
export type DefaultMediaSettingsRow = {
  id: string;
  type: MediaType;
  asset: string;
  albumIds: string;
  durationSec?: number;
  posterAsset?: string;
};

const MAX_MEDIA = 200;
const MAX_ID_LEN = 128;

/**
 * 设置里的 asset 字段可能是字符串，也可能是 `{ url }` / `{ uri }`。
 *
 * @param value - 原始设置值
 * @returns trim 后的 URI 字符串
 */
function coerceSettingsAsset(value: unknown): string {
  if (typeof value !== "string") {
    if (value && typeof value === "object") {
      const raw = value as { url?: unknown; uri?: unknown };
      if (typeof raw.url === "string" && raw.url.trim()) return raw.url.trim();
      if (typeof raw.uri === "string" && raw.uri.trim()) return raw.uri.trim();
    }
    return "";
  }
  return value.trim();
}

/**
 * 将 albumIds 数组序列化为 settings 逗号串。
 *
 * @param albumIds - 相册 id 数组
 * @returns 逗号分隔字符串
 */
export function serializeMediaAlbumIds(albumIds: readonly string[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const raw of albumIds) {
    const id = raw.trim();
    if (id === "" || seen.has(id)) continue;
    seen.add(id);
    parts.push(id);
  }
  return parts.join(",");
}

/**
 * 删除相册后清理媒体归属。
 *
 * @param media - 当前媒体行
 * @param albumId - 被删相册 id
 * @returns 更新后的媒体行（调用方负责 write）
 */
export function stripAlbumIdFromMedia(
  media: readonly EditableDefaultMedia[],
  albumId: string,
): EditableDefaultMedia[] {
  return media.map((row) => ({
    ...row,
    albumIds: row.albumIds.filter((id) => id !== albumId),
  }));
}

/**
 * 规范化 settings 中的一行。
 *
 * @param raw - 原始元素
 * @returns 行或 null
 */
export function normalizeDefaultMediaRow(
  raw: unknown,
): EditableDefaultMedia | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!id) return null;
  const type = parseMediaType(row.type);
  if (type === null) return null;
  const asset = coerceSettingsAsset(row.asset);
  if (asset === "") return null;
  const albumIds = parseCommaIds(row.albumIds);
  let durationSec = 0;
  if (
    typeof row.durationSec === "number" &&
    Number.isFinite(row.durationSec) &&
    row.durationSec > 0
  ) {
    durationSec = row.durationSec;
  }
  const posterAsset = coerceSettingsAsset(row.posterAsset);
  return {
    uid: id.slice(0, MAX_ID_LEN),
    id: id.slice(0, MAX_ID_LEN),
    type,
    asset,
    albumIds,
    durationSec,
    posterAsset,
  };
}

/**
 * 解析 settings 数组为可编辑行。
 *
 * @param raw - defaultMedia 原始值
 * @returns 媒体行
 */
export function parseEditableDefaultMedia(raw: unknown): EditableDefaultMedia[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const rows: EditableDefaultMedia[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, MAX_MEDIA)) {
    const row = normalizeDefaultMediaRow(item);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}

/**
 * 序列化为 settings payload。
 *
 * @param rows - 媒体行
 * @returns 写入 payload
 */
export function serializeEditableDefaultMedia(
  rows: readonly EditableDefaultMedia[],
): DefaultMediaSettingsRow[] {
  const seen = new Set<string>();
  const payload: DefaultMediaSettingsRow[] = [];

  for (const row of rows.slice(0, MAX_MEDIA)) {
    const id = row.id.trim();
    const asset = row.asset.trim();
    if (!id || asset === "" || seen.has(id)) continue;
    seen.add(id);

    const item: DefaultMediaSettingsRow = {
      id: id.slice(0, MAX_ID_LEN),
      type: row.type,
      asset,
      albumIds: serializeMediaAlbumIds(row.albumIds),
    };

    if (
      typeof row.durationSec === "number" &&
      Number.isFinite(row.durationSec) &&
      row.durationSec > 0
    ) {
      item.durationSec = row.durationSec;
    }

    const posterAsset = row.posterAsset.trim();
    if (posterAsset !== "") {
      item.posterAsset = posterAsset;
    }

    payload.push(item);
  }

  return payload;
}

/**
 * 创建空白媒体行（asset 为空，write 前需填写 URI）。
 *
 * @param existingIds - 已有媒体 id
 * @returns 新行
 */
export function createBlankDefaultMedia(
  existingIds: ReadonlySet<string> = new Set(),
): EditableDefaultMedia {
  let id = "new-media";
  if (existingIds.has(id)) {
    for (let i = 2; i < 1000; i += 1) {
      const candidate = `new-media-${i}`;
      if (!existingIds.has(candidate)) {
        id = candidate;
        break;
      }
    }
  }
  return {
    uid: id,
    id,
    type: "image",
    asset: "",
    albumIds: [],
    durationSec: 0,
    posterAsset: "",
  };
}
