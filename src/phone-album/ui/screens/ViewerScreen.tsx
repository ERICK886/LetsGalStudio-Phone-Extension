/**
 * @file ViewerScreen.tsx
 * @description 查看器：图片全屏 + 左右按钮/滑动；视频播放器；素材失败占位。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * - 仅图片支持左右滑动切页；视频页显示 `<video controls>`，不参与滑动。
 * - 同列表相邻 mediaId 切换；到边界时禁用对应按钮。
 * - 素材加载失败显示占位块，仍可继续左右切换。
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { ALL_ALBUM_ID } from "../../constants";
import type { AlbumCatalog } from "../../domain/index";
import type { AlbumAuthorSettings, MediaView } from "../../types";
import { AppHeader, resolveMediaUrl } from "../components/index";

export interface ViewerScreenProps {
  /** 当前相册 id（可为 ALL_ALBUM_ID） */
  albumId: string;
  /** 当前媒体 id */
  mediaId: string;
  /** 作者设置（标题等） */
  settings: AlbumAuthorSettings;
  /** 相册目录 */
  catalog: AlbumCatalog;
  /** 返回上一层（→ grid） */
  onBack: () => void;
  /** 切换到同列表相邻媒体 */
  onNavigate: (albumId: string, mediaId: string) => void;
}

/**
 * @param props - ViewerScreenProps
 * @returns 查看器节点
 */
export function ViewerScreen(props: ViewerScreenProps) {
  const { albumId, mediaId, settings, catalog, onBack, onNavigate } = props;
  const ctx = useExtensionContext();

  const mediaList = useMemo<MediaView[]>(() => {
    if (albumId === ALL_ALBUM_ID) return catalog.allMedia;
    return catalog.mediaByAlbum.get(albumId) ?? [];
  }, [albumId, catalog]);

  const index = useMemo(
    () => mediaList.findIndex((m) => m.id === mediaId),
    [mediaList, mediaId],
  );

  const current = index >= 0 ? mediaList[index] : undefined;
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < mediaList.length - 1;

  const [failed, setFailed] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // 切换媒体时重置失败标记
  useEffect(() => {
    setFailed(false);
  }, [mediaId, albumId]);

  const url = useMemo(() => {
    if (!current) return undefined;
    return resolveMediaUrl(ctx, current.asset);
  }, [ctx, current]);

  const goPrev = () => {
    if (!hasPrev) return;
    onNavigate(albumId, mediaList[index - 1].id);
  };
  const goNext = () => {
    if (!hasNext) return;
    onNavigate(albumId, mediaList[index + 1].id);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (current?.type === "video") return;
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) goPrev();
    else goNext();
  };

  const albumName =
    albumId === ALL_ALBUM_ID ? settings.allAlbumsLabel : albumId;

  return (
    <>
      <AppHeader title={albumName} onBack={onBack} />
      <div className="pa-viewer">
        <div
          className="pa-viewer-stage"
          ref={stageRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {!current ? (
            <div className="pa-viewer-fallback">
              <div className="pa-viewer-fallback-icon">?</div>
              <div>素材不存在</div>
            </div>
          ) : current.type === "video" ? (
            url && !failed ? (
              <video
                src={url}
                controls
                autoPlay
                onError={() => setFailed(true)}
              />
            ) : (
              <div className="pa-viewer-fallback">
                <div className="pa-viewer-fallback-icon">▶</div>
                <div>视频无法播放</div>
              </div>
            )
          ) : url && !failed ? (
            <img
              src={url}
              alt=""
              onError={() => setFailed(true)}
              draggable={false}
            />
          ) : (
            <div className="pa-viewer-fallback">
              <div className="pa-viewer-fallback-icon">⊘</div>
              <div>图片无法显示</div>
            </div>
          )}

          {current?.type === "image" ? (
            <>
              <button
                type="button"
                className="pa-viewer-nav prev"
                onClick={goPrev}
                disabled={!hasPrev}
                aria-label="上一张"
              >
                ‹
              </button>
              <button
                type="button"
                className="pa-viewer-nav next"
                onClick={goNext}
                disabled={!hasNext}
                aria-label="下一张"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
        <div className="pa-viewer-index">
          {index >= 0 ? `${index + 1} / ${mediaList.length}` : "—"}
        </div>
      </div>
    </>
  );
}
