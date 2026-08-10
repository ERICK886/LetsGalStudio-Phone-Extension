/**
 * @file MediaThumb.tsx
 * @description 媒体格：图片缩略 / 视频封面→抽帧→占位 + 角标。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.2.1
 *
 * @remarks
 * Studio 素材多为 `local://`；对 `<video>` 强行 `currentTime` seek 常因无 Range
 * 支持而触发 `error`，误显示「无法加载」。缩略图仅 `preload` 展示首帧，不 seek。
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React, { useEffect, useMemo, useState } from "react";

import type { MediaView } from "../../types";

export interface MediaThumbProps {
  /** 媒体视图（来自 catalog） */
  media: MediaView;
  /** 点击打开查看器 */
  onOpen: (mediaId: string) => void;
  /** 可选：删除（玩家拍照）；点垃圾桶时不打开查看器 */
  onDelete?: (mediaId: string) => void;
}

/** 判断 URL 是否已是可直接渲染的完整 URL（无需再走 asset.resolve）。 */
function isAbsoluteUrl(source: string): boolean {
  return (
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("data:") ||
    source.startsWith("local://") ||
    source.startsWith("blob:")
  );
}

/**
 * 将设置 / 方法参数里的素材字段收成字符串 URI。
 *
 * @param source - 字符串，或 `{ url }` / `{ uri }` 对象
 * @returns trim 后的 URI；无法识别时为空串
 */
export function coerceAssetSource(source: unknown): string {
  if (typeof source === "string") return source.trim();
  if (source && typeof source === "object") {
    const raw = source as { url?: unknown; uri?: unknown };
    if (typeof raw.url === "string" && raw.url.trim()) return raw.url.trim();
    if (typeof raw.uri === "string" && raw.uri.trim()) return raw.uri.trim();
  }
  return "";
}

/**
 * 解析媒体 asset 字段为可渲染 URL。
 *
 * @param ctx - 扩展上下文（提供 asset.resolve）
 * @param source - 媒体 asset 字段（字符串或 AssetRef）
 * @returns 可渲染 URL；解析失败时为 undefined
 *
 * @example
 * ```ts
 * const url = resolveMediaUrl(ctx, media.asset);
 * ```
 */
export function resolveMediaUrl(
  ctx: ReturnType<typeof useExtensionContext>,
  source: unknown,
): string | undefined {
  const text = coerceAssetSource(source);
  if (!text) return undefined;
  if (isAbsoluteUrl(text)) return text;
  try {
    return ctx.asset.resolve(text).url;
  } catch (error) {
    console.warn("[phone-album] 无法解析媒体素材", text, error);
    return undefined;
  }
}

/** 把秒数格式化为 `m:ss`；不足 1 秒按 0:01 显示。 */
export function formatDuration(sec: number): string {
  const s = Math.max(1, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/**
 * 视频缩略：优先 poster 图；否则用 muted video 仅 preload（不 seek）；失败则中性占位。
 *
 * @param props.url - 视频 URL
 * @param props.posterUrl - 可选封面图 URL
 */
function VideoThumbVisual(props: {
  url: string;
  posterUrl?: string;
}): React.ReactElement {
  const { url, posterUrl } = props;
  const [posterFailed, setPosterFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // 换源时重置失败态
  useEffect(() => {
    setPosterFailed(false);
    setVideoFailed(false);
  }, [url, posterUrl]);

  if (posterUrl && !posterFailed) {
    return (
      <img
        src={posterUrl}
        alt=""
        onError={() => setPosterFailed(true)}
      />
    );
  }

  if (!videoFailed) {
    return (
      <video
        src={url}
        muted
        playsInline
        preload="auto"
        // 不在此 seek：Studio local:// 常不支持 Range，seek 会触发 error 误判失败。
        onError={() => {
          console.warn("[phone-album] 视频缩略加载失败", url);
          setVideoFailed(true);
        }}
      />
    );
  }

  // 有合法 URL 但无法解码首帧：仍显示「视频」占位，避免整格「无法加载」。
  return (
    <div className="pa-tile-fallback pa-tile-fallback-video" aria-hidden>
      <span className="pa-tile-fallback-play">▶</span>
    </div>
  );
}

/**
 * @param props - MediaThumbProps
 * @returns 媒体格节点
 */
export function MediaThumb(props: MediaThumbProps) {
  const { media, onOpen, onDelete } = props;
  const ctx = useExtensionContext();
  const [imageFailed, setImageFailed] = useState(false);

  const url = useMemo(
    () => resolveMediaUrl(ctx, media.asset),
    [ctx, media.asset],
  );
  const posterUrl = useMemo(
    () =>
      media.posterAsset
        ? resolveMediaUrl(ctx, media.posterAsset)
        : undefined,
    [ctx, media.posterAsset],
  );

  useEffect(() => {
    setImageFailed(false);
  }, [media.asset, media.id]);

  const showImage = media.type === "image" && Boolean(url) && !imageFailed;

  return (
    <div className="pa-tile-wrap">
      <button
        type="button"
        className="pa-tile"
        onClick={() => onOpen(media.id)}
        aria-label={media.type === "video" ? "视频" : "图片"}
      >
        {media.type === "video" ? (
          url ? (
            <VideoThumbVisual url={url} posterUrl={posterUrl} />
          ) : (
            <div className="pa-tile-fallback pa-tile-fallback-video" aria-hidden>
              <span className="pa-tile-fallback-play">▶</span>
            </div>
          )
        ) : showImage ? (
          <img src={url} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <div className="pa-tile-fallback">无法加载</div>
        )}
        {media.type === "video" ? (
          <span className="pa-tile-badge" aria-hidden>
            <svg viewBox="0 0 12 12">
              <path d="M3 2 L10 6 L3 10 Z" />
            </svg>
            {typeof media.durationSec === "number" && media.durationSec > 0
              ? formatDuration(media.durationSec)
              : "视频"}
          </span>
        ) : null}
      </button>
      {onDelete ? (
        <button
          type="button"
          className="pa-tile-delete"
          aria-label="删除照片"
          title="删除"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(media.id);
          }}
        >
          <i className="fa-solid fa-trash-can" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
