/**
 * @file mutations.ts
 * @description 存档突变纯函数：相册 / 媒体的增删改归属，均返回新 `AlbumSaveState`，不改入参。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import { ALL_ALBUM_ID } from "../constants";
import type {
  AlbumAuthorSettings,
  AlbumMedia,
  AlbumMediaLink,
  AlbumMeta,
  AlbumSaveState,
  MediaType,
} from "../types";
import { listVisibleAlbumIds } from "./merge";

/** 浅拷贝存档（数组层重新分配，元素引用保持）。 */
function cloneState(state: AlbumSaveState): AlbumSaveState {
  return {
    albumsExtra: [...state.albumsExtra],
    albumsRemoved: [...state.albumsRemoved],
    albumsMeta: state.albumsMeta.map((m) => ({ ...m })),
    media: state.media.map((m) => ({ ...m })),
    albumMedia: state.albumMedia.map((l) => ({ ...l })),
    mediaRemoved: [...state.mediaRemoved],
  };
}

/** 计算可见相册 id 集合（与 merge.listVisibleAlbumIds 一致）。 */
function visibleAlbumSet(
  settings: AlbumAuthorSettings,
  state: AlbumSaveState,
): Set<string> {
  return new Set(listVisibleAlbumIds(settings, state));
}

/** 过滤 albumIds：仅保留可见相册，未知 id 触发 warn。 */
function filterVisibleAlbumIds(
  settings: AlbumAuthorSettings,
  state: AlbumSaveState,
  albumIds: string[],
): string[] {
  const visible = visibleAlbumSet(settings, state);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of albumIds) {
    if (id === "" || seen.has(id)) continue;
    seen.add(id);
    if (!visible.has(id)) {
      console.warn(`[phone-album] 未知 / 已删相册 id 被忽略：${id}`);
      continue;
    }
    out.push(id);
  }
  return out;
}

/** upsert albumsMeta：按 id 覆盖或追加。 */
function upsertMeta(metas: AlbumMeta[], meta: AlbumMeta): AlbumMeta[] {
  const idx = metas.findIndex((m) => m.id === meta.id);
  if (idx === -1) return [...metas, meta];
  const out = metas.map((m) => ({ ...m }));
  out[idx] = { ...out[idx], ...meta };
  return out;
}

/** upsert media：按 id 覆盖或追加。 */
function upsertMedia(medias: AlbumMedia[], media: AlbumMedia): AlbumMedia[] {
  const idx = medias.findIndex((m) => m.id === media.id);
  if (idx === -1) return [...medias, media];
  const out = medias.map((m) => ({ ...m }));
  out[idx] = media;
  return out;
}

/**
 * 新增 / 覆盖相册：从 `albumsRemoved` 去掉 id；非默认相册且不在 `albumsExtra` 时追加 extra；upsert `albumsMeta`。
 *
 * @param state - 当前存档。
 * @param settings - 作者设置快照。
 * @param payload - `{ albumId, name, coverMediaId?, coverAsset? }`。
 * @returns 新存档；空 albumId 返回原 state。
 */
export function applyAddAlbum(
  state: AlbumSaveState,
  settings: AlbumAuthorSettings,
  payload: { albumId: string; name: string; coverMediaId?: string; coverAsset?: string },
): AlbumSaveState {
  const albumId = payload.albumId?.trim() ?? "";
  if (albumId === "") {
    console.warn("[phone-album] applyAddAlbum：空 albumId");
    return state;
  }
  const next = cloneState(state);

  next.albumsRemoved = next.albumsRemoved.filter((id) => id !== albumId);

  const isDefault = settings.defaultAlbums.some((d) => d.id === albumId);
  if (!isDefault && !next.albumsExtra.includes(albumId)) {
    next.albumsExtra = [...next.albumsExtra, albumId];
  }

  const meta: AlbumMeta = { id: albumId, name: payload.name };
  if (payload.coverMediaId !== undefined) meta.coverMediaId = payload.coverMediaId;
  if (payload.coverAsset !== undefined) meta.coverAsset = payload.coverAsset;
  next.albumsMeta = upsertMeta(next.albumsMeta, meta);

  return next;
}

/**
 * 删除相册：默认相册写入 `albumsRemoved`；否则从 `albumsExtra` / `albumsMeta` 删除；删除该相册的全部 `albumMedia` 行；不动 `media` / `mediaRemoved`。禁止删除 `ALL_ALBUM_ID`。
 *
 * @param state - 当前存档。
 * @param settings - 作者设置快照。
 * @param albumId - 待删相册 id。
 * @returns 新存档；空 albumId 或 `ALL_ALBUM_ID` 返回原 state。
 */
export function applyRemoveAlbum(
  state: AlbumSaveState,
  settings: AlbumAuthorSettings,
  albumId: string,
): AlbumSaveState {
  const id = albumId?.trim() ?? "";
  if (id === "") {
    console.warn("[phone-album] applyRemoveAlbum：空 albumId");
    return state;
  }
  if (id === ALL_ALBUM_ID) {
    console.warn("[phone-album] 禁止删除虚拟「全部」相册");
    return state;
  }

  const next = cloneState(state);
  const isDefault = settings.defaultAlbums.some((d) => d.id === id);

  if (isDefault) {
    if (!next.albumsRemoved.includes(id)) {
      next.albumsRemoved = [...next.albumsRemoved, id];
    }
  } else {
    next.albumsExtra = next.albumsExtra.filter((x) => x !== id);
  }
  next.albumsMeta = next.albumsMeta.filter((m) => m.id !== id);
  next.albumMedia = next.albumMedia.filter((l) => l.albumId !== id);

  return next;
}

/**
 * 新增 / 覆盖媒体：从 `mediaRemoved` 去掉 id；upsert `media[]`；按可见相册集合过滤 `albumIds`（未知 id warn + skip）；替换该媒体全部归属边为过滤后列表。
 *
 * @param state - 当前存档。
 * @param settings - 作者设置快照。
 * @param payload - `{ mediaId, type, asset, albumIds, durationSec?, posterAsset? }`。
 * @returns 新存档；空 mediaId 返回原 state。
 */
export function applyAddMedia(
  state: AlbumSaveState,
  settings: AlbumAuthorSettings,
  payload: {
    mediaId: string;
    type: MediaType;
    asset: string;
    albumIds: string[];
    durationSec?: number;
    posterAsset?: string;
  },
): AlbumSaveState {
  const mediaId = payload.mediaId?.trim() ?? "";
  if (mediaId === "") {
    console.warn("[phone-album] applyAddMedia：空 mediaId");
    return state;
  }
  const next = cloneState(state);

  next.mediaRemoved = next.mediaRemoved.filter((id) => id !== mediaId);

  const media: AlbumMedia = {
    id: mediaId,
    type: payload.type,
    asset: payload.asset,
    createdAt: Date.now(),
  };
  if (payload.durationSec !== undefined) media.durationSec = payload.durationSec;
  const poster = payload.posterAsset?.trim() ?? "";
  if (poster !== "") media.posterAsset = poster;
  next.media = upsertMedia(next.media, media);

  const filteredIds = filterVisibleAlbumIds(settings, state, payload.albumIds);
  next.albumMedia = next.albumMedia.filter((l) => l.mediaId !== mediaId);
  const newLinks: AlbumMediaLink[] = filteredIds.map((albumId) => ({
    albumId,
    mediaId,
  }));
  next.albumMedia = [...next.albumMedia, ...newLinks];

  return next;
}

/**
 * 删除媒体：从 `media[]` 删除；push 到 `mediaRemoved`（若尚未有）；删除全部相关 `albumMedia`；清理各相册 `coverMediaId === mediaId`。
 *
 * @param state - 当前存档。
 * @param settings - 作者设置快照。
 * @param mediaId - 待删媒体 id。
 * @returns 新存档；空 mediaId 返回原 state。
 */
export function applyRemoveMedia(
  state: AlbumSaveState,
  settings: AlbumAuthorSettings,
  mediaId: string,
): AlbumSaveState {
  const id = mediaId?.trim() ?? "";
  if (id === "") {
    console.warn("[phone-album] applyRemoveMedia：空 mediaId");
    return state;
  }
  const next = cloneState(state);

  next.media = next.media.filter((m) => m.id !== id);
  if (!next.mediaRemoved.includes(id)) {
    next.mediaRemoved = [...next.mediaRemoved, id];
  }
  next.albumMedia = next.albumMedia.filter((l) => l.mediaId !== id);
  next.albumsMeta = next.albumsMeta.map((m) =>
    m.coverMediaId === id ? { ...m, coverMediaId: undefined } : m,
  );

  return next;
}

/**
 * 替换媒体归属：媒体不存在（合并后也无）→ no-op；否则替换归属边（同样过滤未知相册）。
 *
 * @param state - 当前存档。
 * @param settings - 作者设置快照。
 * @param mediaId - 媒体 id。
 * @param albumIds - 新归属相册 id 列表。
 * @returns 新存档；空 mediaId 或媒体不存在返回原 state。
 */
export function applySetMediaAlbums(
  state: AlbumSaveState,
  settings: AlbumAuthorSettings,
  mediaId: string,
  albumIds: string[],
): AlbumSaveState {
  const id = mediaId?.trim() ?? "";
  if (id === "") {
    console.warn("[phone-album] applySetMediaAlbums：空 mediaId");
    return state;
  }

  const defaultMediaIds = new Set(settings.defaultMedia.map((d) => d.id));
  const saveMediaIds = new Set(state.media.map((m) => m.id));
  const removedIds = new Set(state.mediaRemoved);
  const exists =
    (defaultMediaIds.has(id) || saveMediaIds.has(id)) && !removedIds.has(id);
  if (!exists) {
    console.warn(`[phone-album] applySetMediaAlbums：媒体不存在 ${id}`);
    return state;
  }

  const next = cloneState(state);
  const filteredIds = filterVisibleAlbumIds(settings, state, albumIds);
  next.albumMedia = next.albumMedia.filter((l) => l.mediaId !== id);
  const newLinks: AlbumMediaLink[] = filteredIds.map((albumId) => ({
    albumId,
    mediaId: id,
  }));
  next.albumMedia = [...next.albumMedia, ...newLinks];

  return next;
}
