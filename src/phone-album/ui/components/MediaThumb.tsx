/**
 * @file MediaThumb.tsx
 * @description 媒体格：图片缩略 / 视频首帧 + 视频角标 + 失败占位。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * - 资源 URL 解析：对已是 `http(s):` / `data:` / `local:` / `blob:` 的 URL 直接使用，
 *   其余相对引用交给 `ctx.asset.resolve(...).url`。
 * - 图片失败时切回占位块；视频角标始终显示（不预加载首帧以省性能）。
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React, { useMemo, useState } from "react";

import type { MediaView } from "../../types";

export interface MediaThumbProps {
  /** 媒体视图（来自 catalog） */
  media: MediaView;
  /** 点击打开查看器 */
  onOpen: (mediaId: string) => void;
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
 * 解析媒体 asset 字段为可渲染 URL。
 *
 * @param ctx - 扩展上下文（提供 asset.resolve）
 * @param source - 媒体 asset 字段
 * @returns 可渲染 URL；解析失败时为 undefined
 */
export function resolveMediaUrl(
  ctx: ReturnType<typeof useExtensionContext>,
  source: string,
): string | undefined {
  if (!source) return undefined;
  if (isAbsoluteUrl(source)) return source;
  try {
    return ctx.asset.resolve(source).url;
  } catch (error) {
    console.warn("[phone-album] 无法解析媒体素材", source, error);
    return undefined;
  }
}

/**
 * @param props - MediaThumbProps
 * @returns 媒体格节点
 */
export function MediaThumb(props: MediaThumbProps) {
  const { media, onOpen } = props;
  const ctx = useExtensionContext();
  const [failed, setFailed] = useState(false);

  const url = useMemo(() => resolveMediaUrl(ctx, media.asset), [ctx, media.asset]);
  const showImg = Boolean(url) && !failed;

  return (
    <button
      type="button"
      className="pa-tile"
      onClick={() => onOpen(media.id)}
      aria-label={media.type === "video" ? "视频" : "图片"}
    >
      {showImg ? (
        <img src={url} alt="" onError={() => setFailed(true)} />
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
  );
}

/** 把秒数格式化为 `m:ss`；不足 1 秒按 0:01 显示。 */
function formatDuration(sec: number): string {
  const s = Math.max(1, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
