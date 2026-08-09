/**
 * @file AlbumCard.tsx
 * @description 相册卡片：封面 + 名称 + 数量角标。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * 封面失败时回落到首字占位；点击触发 onOpen。
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
  const showImg = Boolean(url) && !failed;
  const glyph = Array.from(album.name.trim())[0]?.toUpperCase() ?? "?";

  return (
    <button
      type="button"
      className="pa-album-card"
      onClick={() => onOpen(album.id)}
    >
      <div className="pa-album-thumb">
        {showImg ? (
          <img src={url} alt="" onError={() => setFailed(true)} />
        ) : (
          <span className="pa-album-glyph">{glyph}</span>
        )}
        <span className="pa-album-count">{album.count}</span>
      </div>
      <p className="pa-album-title">{album.name}</p>
    </button>
  );
}
