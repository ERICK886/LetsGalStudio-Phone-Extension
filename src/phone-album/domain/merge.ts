/**
 * @file merge.ts
 * @description 默认设置 + 存档 → 可见相册 / 媒体视图模型的合并纯函数。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import { ALL_ALBUM_ID } from "../constants.js";
import type {
  AlbumAuthorSettings,
  AlbumMeta,
  AlbumSaveState,
  AlbumView,
  DefaultAlbumSeed,
  MediaView,
} from "../types.js";

/** buildAlbumCatalog 返回结构。 */
export interface AlbumCatalog {
  albums: AlbumView[];
  mediaByAlbum: Map<string, MediaView[]>;
  allMedia: MediaView[];
}

/**
 * 计算可见相册 id 列表（保序）：默认相册 − albumsRemoved ∪ albumsExtra ∪（仅出现在 albumsMeta 且未 removed 的 id）。
 *
 * @param settings - 作者设置快照。
 * @param save - slot 存档状态。
 * @returns 保序的可见相册 id 数组。
 */
export function listVisibleAlbumIds(
  settings: AlbumAuthorSettings,
  save: AlbumSaveState,
): string[] {
  const removed = new Set(save.albumsRemoved);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (id: string): void => {
    if (id === "" || removed.has(id) || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };
  for (const d of settings.defaultAlbums) push(d.id);
  for (const id of save.albumsExtra) push(id);
  for (const m of save.albumsMeta) push(m.id);
  return out;
}

/**
 * 合并默认设置与存档，生成 UI 用的相册卡片 / 各相册媒体 / 全部媒体。
 *
 * 规则：
 * 1. 可见相册 id = 默认相册 − albumsRemoved ∪ albumsExtra ∪（albumsMeta 中未 removed 的 id）。
 * 2. 相册显示名 / 封面：albumsMeta 覆盖默认；否则默认 name / coverAsset。
 * 3. 可见媒体：默认媒体（扣 mediaRemoved）∪ save.media（同 id 以 save.media 覆盖）；再扣 mediaRemoved。
 * 4. 归属：默认媒体 albumIds 生成种子边；再并上 save.albumMedia；指向已删相册的边不展示，但媒体仍在「全部」。
 * 5. albums 首项为虚拟 ALL_ALBUM_ID（allAlbumsLabel、count=全部媒体数、封面=第一张媒体 asset），其后为可见相册。
 * 6. mediaByAlbum 含真实相册 id；不含 __all__。
 *
 * @param settings - 作者设置快照。
 * @param save - slot 存档状态。
 * @returns 相册目录（albums / mediaByAlbum / allMedia）。
 */
export function buildAlbumCatalog(
  settings: AlbumAuthorSettings,
  save: AlbumSaveState,
): AlbumCatalog {
  const visibleIds = listVisibleAlbumIds(settings, save);
  const visibleSet = new Set(visibleIds);

  const metaById = new Map<string, AlbumMeta>(
    save.albumsMeta.map((m) => [m.id, m]),
  );
  const defaultAlbumById = new Map<string, DefaultAlbumSeed>(
    settings.defaultAlbums.map((d) => [d.id, d]),
  );

  const mediaRemoved = new Set(save.mediaRemoved);

  const mediaById = new Map<string, MediaView>();
  for (const d of settings.defaultMedia) {
    if (mediaRemoved.has(d.id)) continue;
    mediaById.set(d.id, {
      id: d.id,
      type: d.type,
      asset: d.asset,
      durationSec: d.durationSec,
    });
  }
  for (const m of save.media) {
    if (mediaRemoved.has(m.id)) continue;
    mediaById.set(m.id, {
      id: m.id,
      type: m.type,
      asset: m.asset,
      durationSec: m.durationSec,
    });
  }
  const allMedia: MediaView[] = [...mediaById.values()];

  const mediaByAlbum = new Map<string, MediaView[]>();
  const added = new Map<string, Set<string>>();
  for (const id of visibleIds) {
    mediaByAlbum.set(id, []);
    added.set(id, new Set());
  }
  const addEdge = (albumId: string, mediaId: string): void => {
    if (!visibleSet.has(albumId)) return;
    if (!mediaById.has(mediaId)) return;
    const set = added.get(albumId);
    if (!set || set.has(mediaId)) return;
    set.add(mediaId);
    mediaByAlbum.get(albumId)!.push(mediaById.get(mediaId)!);
  };
  for (const d of settings.defaultMedia) {
    if (!mediaById.has(d.id)) continue;
    for (const albumId of d.albumIds) addEdge(albumId, d.id);
  }
  for (const link of save.albumMedia) {
    addEdge(link.albumId, link.mediaId);
  }

  const albums: AlbumView[] = [
    {
      id: ALL_ALBUM_ID,
      name: settings.allAlbumsLabel,
      count: allMedia.length,
      coverAsset: allMedia.length > 0 ? allMedia[0].asset : undefined,
      isVirtualAll: true,
    },
  ];
  for (const id of visibleIds) {
    const list = mediaByAlbum.get(id)!;
    const meta = metaById.get(id);
    const fallbackCover =
      meta?.coverAsset ?? defaultAlbumById.get(id)?.coverAsset;
    let coverAsset: string | undefined;
    if (meta?.coverMediaId && mediaById.has(meta.coverMediaId)) {
      coverAsset = mediaById.get(meta.coverMediaId)!.asset;
    } else if (fallbackCover) {
      coverAsset = fallbackCover;
    } else if (list.length > 0) {
      coverAsset = list[0].asset;
    }
    albums.push({
      id,
      name: meta?.name ?? defaultAlbumById.get(id)?.name ?? id,
      count: list.length,
      coverAsset,
    });
  }

  return { albums, mediaByAlbum, allMedia };
}
