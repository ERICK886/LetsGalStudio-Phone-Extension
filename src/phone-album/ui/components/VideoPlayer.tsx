/**
 * @file VideoPlayer.tsx
 * @description 相册查看器手机风视频控件：播放/暂停、进度、时长、静音、点显隐。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

import { formatDuration } from "./MediaThumb";

export interface VideoPlayerProps {
  /** 可播放 URL */
  src: string;
  /** 可选海报图 */
  poster?: string;
  /** 加载失败回调 */
  onError?: () => void;
}

/**
 * 手机风视频播放器（无原生 controls）。
 *
 * @param props - VideoPlayerProps
 * @returns 播放器节点
 *
 * @remarks
 * - 尝试 autoPlay；失败则停在暂停态
 * - 单击画面：切换播放/暂停，并短暂显示控件条
 * - 控件条空闲约 2.5s 后自动隐藏（播放中）
 *
 * @example
 * ```tsx
 * <VideoPlayer src={url} poster={posterUrl} onError={() => setFailed(true)} />
 * ```
 */
export function VideoPlayer(props: VideoPlayerProps): React.ReactElement {
  const { src, poster, onError } = props;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>();

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);

  const clearHideTimer = () => {
    if (hideTimer.current !== undefined) {
      clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    }
  };

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      setControlsVisible(false);
      hideTimer.current = undefined;
    }, 2500);
  }, []);

  const showControlsBriefly = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    return () => clearHideTimer();
  }, []);

  // 换源时重置
  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setControlsVisible(true);
    clearHideTimer();
    const el = videoRef.current;
    if (!el) return;
    el.load();
    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          setPlaying(true);
          scheduleHide();
        })
        .catch(() => {
          setPlaying(false);
          setControlsVisible(true);
        });
    }
  }, [src, scheduleHide]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(
        () => {
          setPlaying(true);
          scheduleHide();
        },
        () => setPlaying(false),
      );
    } else {
      el.pause();
      setPlaying(false);
      setControlsVisible(true);
      clearHideTimer();
    }
  }, [scheduleHide]);

  const onStageClick = (event: React.MouseEvent) => {
    // 点击控件条内按钮不触发 toggle（stopPropagation）
    if ((event.target as HTMLElement).closest(".pa-vctrl")) return;
    togglePlay();
    showControlsBriefly();
  };

  const onSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoRef.current;
    if (!el) return;
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return;
    el.currentTime = next;
    setCurrent(next);
    showControlsBriefly();
  };

  const toggleMute = (event: React.MouseEvent) => {
    event.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    showControlsBriefly();
  };

  const onPlayPauseButton = (event: React.MouseEvent) => {
    event.stopPropagation();
    togglePlay();
  };

  const progressMax = duration > 0 ? duration : 0;
  const progressValue = Math.min(current, progressMax || current);

  return (
    <div
      className={`pa-video-player${controlsVisible ? " is-controls" : ""}`}
      onClick={onStageClick}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        muted={muted}
        onError={() => onError?.()}
        onTimeUpdate={() => {
          const el = videoRef.current;
          if (el) setCurrent(el.currentTime);
        }}
        onLoadedMetadata={() => {
          const el = videoRef.current;
          if (el && Number.isFinite(el.duration)) setDuration(el.duration);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setControlsVisible(true);
          clearHideTimer();
        }}
      />

      <div
        className="pa-vctrl"
        onClick={(event) => event.stopPropagation()}
        aria-hidden={!controlsVisible}
      >
        <button
          type="button"
          className="pa-vctrl-play"
          onClick={onPlayPauseButton}
          aria-label={playing ? "暂停" : "播放"}
        >
          {playing ? "❚❚" : "▶"}
        </button>

        <input
          type="range"
          className="pa-vctrl-seek"
          min={0}
          max={progressMax || 1}
          step={0.05}
          value={progressValue}
          onChange={onSeek}
          aria-label="进度"
        />

        <span className="pa-vctrl-time" aria-hidden>
          {formatDuration(current || 0)}
          {" / "}
          {duration > 0 ? formatDuration(duration) : "--:--"}
        </span>

        <button
          type="button"
          className="pa-vctrl-mute"
          onClick={toggleMute}
          aria-label={muted ? "取消静音" : "静音"}
        >
          {muted ? "静音" : "声音"}
        </button>
      </div>
    </div>
  );
}
