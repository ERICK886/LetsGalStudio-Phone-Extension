/**
 * @file GridScreen.tsx
 * @description 网格页：3~4 列媒体格；玩家拍照可删。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.2.0
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React, { useCallback, useMemo } from "react";

import { ALL_ALBUM_ID, CAMERA_ALBUM_ID } from "../../constants";
import type { AlbumCatalog } from "../../domain/index";
import { executeRemoveCameraPhoto } from "../../runtime/actions";
import { isCameraMediaId } from "../../runtime/store";
import { getAlbumRuntimeKey } from "../../runtime/runtime-key";
import type { AlbumAuthorSettings, MediaView } from "../../types";
import { AppHeader, EmptyHint, MediaThumb } from "../components/index";

export interface GridScreenProps {
  /** 当前相册 id（可为 ALL_ALBUM_ID） */
  albumId: string;
  /** 作者设置（标题等） */
  settings: AlbumAuthorSettings;
  /** 相册目录 */
  catalog: AlbumCatalog;
  /** 返回上一层 */
  onBack: () => void;
  /** 进入查看器 */
  onOpenViewer: (albumId: string, mediaId: string) => void;
}

/**
 * @param props - GridScreenProps
 * @returns 网格页节点
 */
export function GridScreen(props: GridScreenProps) {
  const { albumId, settings, catalog, onBack, onOpenViewer } = props;
  const ctx = useExtensionContext();
  const runtimeKey = getAlbumRuntimeKey(ctx);

  const mediaList = useMemo<MediaView[]>(() => {
    if (albumId === ALL_ALBUM_ID) return catalog.allMedia;
    return catalog.mediaByAlbum.get(albumId) ?? [];
  }, [albumId, catalog]);

  const albumName = useMemo(() => {
    if (albumId === ALL_ALBUM_ID) return settings.allAlbumsLabel;
    return catalog.albums.find((a) => a.id === albumId)?.name ?? albumId;
  }, [albumId, catalog, settings.allAlbumsLabel]);

  const allowDeleteInAlbum =
    albumId === CAMERA_ALBUM_ID || albumId === ALL_ALBUM_ID;

  const onDelete = useCallback(
    async (mediaId: string) => {
      if (!isCameraMediaId(runtimeKey, mediaId)) return;
      const ok = window.confirm("删除这张照片？删除后无法恢复。");
      if (!ok) return;
      if (!executeRemoveCameraPhoto(runtimeKey, mediaId)) return;
      try {
        await ctx.archive.flushShared();
      } catch (error) {
        console.warn("[phone-album] 删除后 flushShared 失败", error);
      }
    },
    [ctx, runtimeKey],
  );

  return (
    <>
      <AppHeader title={albumName} onBack={onBack} />
      <div className="pa-body">
        {mediaList.length === 0 ? (
          <EmptyHint text={settings.emptyAlbumHint} />
        ) : (
          <div className="pa-grid">
            {mediaList.map((media) => (
              <MediaThumb
                key={media.id}
                media={media}
                onOpen={(id) => onOpenViewer(albumId, id)}
                onDelete={
                  allowDeleteInAlbum && isCameraMediaId(runtimeKey, media.id)
                    ? onDelete
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
