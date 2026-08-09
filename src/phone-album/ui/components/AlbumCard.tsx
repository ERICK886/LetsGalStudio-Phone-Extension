/**
 * @file AlbumCard.tsx
 * @description 相册卡片：封面 + 名称 + 数量角标。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.2.0
 *
 * @remarks
 * 封面失败时回落到首字占位。封面若为视频 URL，用 muted video 抽帧。
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React, { useMemo, useState } from "react";

import type { AlbumView } from "../../types";
import { resolveMediaUrl } from "./MediaThumb";

export interface AlbumCardProps {
  /** 相册视图（来自 catalog.albums） */
  album: AlbumView;
  /** 点击打开网格 */
  onOpen: (albumId: string) => void;
}

/** 粗略判断 URL / 路径是否像视频。 */
function looksLikeVideo(source: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(source);
}

/**
 * @param props - AlbumCardProps
 * @returns 相册卡片节点
 */
export function AlbumCard(props: AlbumCardProps) {
  const { album, onOpen } = props;
  const ctx = useExtensionContext();
  const [failed, setFailed] = useState(false);
  const url = useMemo(
    () => resolveMediaUrl(ctx, album.coverAsset ?? ""),
    [ctx, album.coverAsset],
  );
  const asVideo =
    Boolean(album.coverAsset) && looksLikeVideo(album.coverAsset!);
  const showMedia = Boolean(url) && !failed;
  const glyph = Array.from(album.name.trim())[0]?.toUpperCase() ?? "?";

  return (
    <button
      type="button"
      className="pa-album-card"
      onClick={() => onOpen(album.id)}
    >
      <div className="pa-album-thumb">
        {showMedia ? (
          asVideo ? (
            <video
              src={url}
              muted
              playsInline
              // 不 seek：Studio local:// 常因无 Range 支持而在 seek 时 error。
              preload="auto"
              onError={() => setFailed(true)}
            />
          ) : (
            <img src={url} alt="" onError={() => setFailed(true)} />
          )
        ) : (
          <span className="pa-album-glyph">{glyph}</span>
        )}
        <span className="pa-album-count">{album.count}</span>
      </div>
      <p className="pa-album-title">{album.name}</p>
    </button>
  );
}
