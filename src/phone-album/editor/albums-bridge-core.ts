/**
 * @file albums-bridge-core.ts
 * @description 默认相册 bridge 纯函数（无 phone-sdk 依赖，便于 node:test）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import { MAX_LABEL_LEN } from "../constants.ts";

/** 可编辑默认相册行。 */
export interface EditableDefaultAlbum {
  /** 稳定行键（编辑器用，不写入 settings） */
  uid: string;
  /** 相册 ID */
  id: string;
  /** 显示名 */
  name: string;
  /** 封面素材 URI（可为空） */
  coverAsset: string;
}

/** settings 写入 payload 元素。 */
export type DefaultAlbumSettingsRow = {
  id: string;
  name: string;
  coverAsset?: string;
};

const MAX_ALBUMS = 40;
const MAX_ID_LEN = 128;

/**
 * 规范化 settings 中的一行。
 *
 * @param raw - 原始元素
 * @returns 行或 null
 */
export function normalizeDefaultAlbumRow(
  raw: unknown,
): EditableDefaultAlbum | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!id) return null;
  const nameRaw = typeof row.name === "string" ? row.name.trim() : "";
  const name = (nameRaw || id).slice(0, MAX_LABEL_LEN);
  const coverRaw =
    typeof row.coverAsset === "string"
      ? row.coverAsset
      : typeof row.asset === "string"
        ? row.asset
        : "";
  const coverAsset = coverRaw.trim();
  return {
    uid: id.slice(0, MAX_ID_LEN),
    id: id.slice(0, MAX_ID_LEN),
    name,
    coverAsset,
  };
}

/**
 * 解析 settings 数组为可编辑行。
 *
 * @param raw - defaultAlbums 原始值
 * @returns 相册行
 */
export function parseEditableDefaultAlbums(raw: unknown): EditableDefaultAlbum[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const rows: EditableDefaultAlbum[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, MAX_ALBUMS)) {
    const row = normalizeDefaultAlbumRow(item);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}

/**
 * 序列化为 settings payload。
 *
 * @param rows - 相册行
 * @returns 写入 payload
 */
export function serializeEditableDefaultAlbums(
  rows: readonly EditableDefaultAlbum[],
): DefaultAlbumSettingsRow[] {
  const seen = new Set<string>();
  const payload: DefaultAlbumSettingsRow[] = [];
  for (const row of rows.slice(0, MAX_ALBUMS)) {
    const id = row.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const nameRaw = row.name.trim();
    const name = (nameRaw || id).slice(0, MAX_LABEL_LEN);
    const coverAsset = row.coverAsset.trim();
    const item: DefaultAlbumSettingsRow = {
      id: id.slice(0, MAX_ID_LEN),
      name,
    };
    if (coverAsset !== "") {
      item.coverAsset = coverAsset;
    }
    payload.push(item);
  }
  return payload;
}

/**
 * 创建空白相册行。
 *
 * @param existingIds - 已有相册 id
 * @returns 新行
 */
export function createBlankDefaultAlbum(
  existingIds: ReadonlySet<string> = new Set(),
): EditableDefaultAlbum {
  let id = "new-album";
  if (existingIds.has(id)) {
    for (let i = 2; i < 1000; i += 1) {
      const candidate = `new-album-${i}`;
      if (!existingIds.has(candidate)) {
        id = candidate;
        break;
      }
    }
  }
  return { uid: id, id, name: "新相册", coverAsset: "" };
}
