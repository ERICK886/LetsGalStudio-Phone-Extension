/**
 * @file actions.ts
 * @description 相册 / 媒体的增删改归属动作（编排 domain mutations + runtime store）。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * 所有动作均从 `getCachedAuthorSettings()` 取设置、从 `getAlbumSaveState()` 取存档，
 * 调用 domain 纯函数得到新状态后用 `setAlbumSaveState(next)` 整体写回并广播总线。
 * 空 id 一律 `console.warn` + return，不写入存档。
 */

import type { MediaType } from "../types.js";
import {
  applyAddAlbum,
  applyAddMedia,
  applyRemoveAlbum,
  applyRemoveMedia,
  applySetMediaAlbums,
} from "../domain/index.js";
import { getCachedAuthorSettings } from "./settings.js";
import { getAlbumSaveState, setAlbumSaveState } from "./store.js";

/**
 * 新增 / 覆盖相册。
 *
 * @param input.albumId - 相册 id（空则 warn + return）
 * @param input.name - 相册显示名
 * @param input.coverMediaId - 可选，封面媒体 id
 * @param input.coverAsset - 可选，封面 asset
 */
export function executeAddAlbum(input: {
  albumId: string;
  name: string;
  coverMediaId?: string;
  coverAsset?: string;
}): void {
  const albumId = input.albumId?.trim() ?? "";
  if (albumId === "") {
    console.warn("[phone-album] executeAddAlbum：空 albumId");
    return;
  }
  const settings = getCachedAuthorSettings();
  const next = applyAddAlbum(getAlbumSaveState(), settings, input);
  setAlbumSaveState(next);
}

/**
 * 删除相册（禁止删除虚拟「全部」相册）。
 *
 * @param albumId - 相册 id（空 / `__all__` 则 warn + return）
 */
export function executeRemoveAlbum(albumId: string): void {
  const id = albumId?.trim() ?? "";
  if (id === "") {
    console.warn("[phone-album] executeRemoveAlbum：空 albumId");
    return;
  }
  const settings = getCachedAuthorSettings();
  const next = applyRemoveAlbum(getAlbumSaveState(), settings, id);
  setAlbumSaveState(next);
}

/**
 * 新增 / 覆盖媒体。
 *
 * @param input.mediaId - 媒体 id（空则 warn + return）
 * @param input.type - 媒体类型
 * @param input.asset - 资源标识
 * @param input.albumIds - 归属相册 id 列表
 * @param input.durationSec - 可选时长（视频）
 */
export function executeAddMedia(input: {
  mediaId: string;
  type: MediaType;
  asset: string;
  albumIds: string[];
  durationSec?: number;
}): void {
  const mediaId = input.mediaId?.trim() ?? "";
  if (mediaId === "") {
    console.warn("[phone-album] executeAddMedia：空 mediaId");
    return;
  }
  const settings = getCachedAuthorSettings();
  const next = applyAddMedia(getAlbumSaveState(), settings, input);
  setAlbumSaveState(next);
}

/**
 * 删除媒体。
 *
 * @param mediaId - 媒体 id（空则 warn + return）
 */
export function executeRemoveMedia(mediaId: string): void {
  const id = mediaId?.trim() ?? "";
  if (id === "") {
    console.warn("[phone-album] executeRemoveMedia：空 mediaId");
    return;
  }
  const settings = getCachedAuthorSettings();
  const next = applyRemoveMedia(getAlbumSaveState(), settings, id);
  setAlbumSaveState(next);
}

/**
 * 替换媒体归属相册列表。
 *
 * @param mediaId - 媒体 id（空则 warn + return）
 * @param albumIds - 新归属相册 id 列表
 */
export function executeSetMediaAlbums(
  mediaId: string,
  albumIds: string[],
): void {
  const id = mediaId?.trim() ?? "";
  if (id === "") {
    console.warn("[phone-album] executeSetMediaAlbums：空 mediaId");
    return;
  }
  const settings = getCachedAuthorSettings();
  const next = applySetMediaAlbums(
    getAlbumSaveState(),
    settings,
    id,
    albumIds,
  );
  setAlbumSaveState(next);
}
