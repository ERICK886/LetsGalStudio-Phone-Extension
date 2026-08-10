/**
 * @file CameraScreen.tsx
 * @description 手机风拍照界面：取景框 + 中下圆形快门，点击截取游戏画面。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React, { useCallback, useState } from "react";

import { CAMERA_ALBUM_ID } from "../../constants";
import { captureGamePhoto } from "../../runtime/capture";
import {
  getLastShotThumb,
  isCaptureBusy,
} from "../../runtime/camera-session";

export interface CameraScreenProps {
  /** 关闭整部手机（截图前必须关壳，避免 UI 入画） */
  closePhone: () => void;
  /** 拍完后切到相册并打开相机胶卷（可选） */
  onOpenCameraRoll?: () => void;
}

/**
 * @param props - CameraScreenProps
 * @returns 拍照页
 */
export function CameraScreen(props: CameraScreenProps) {
  const { closePhone, onOpenCameraRoll } = props;
  const ctx = useExtensionContext();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [hint, setHint] = useState("点击快门拍摄当前游戏画面");
  const [thumb, setThumb] = useState<string | undefined>(() =>
    getLastShotThumb(),
  );

  const onShutter = useCallback(async () => {
    if (busy || isCaptureBusy()) return;
    setBusy(true);
    setHint("正在拍照…");
    setFlash(true);
    window.setTimeout(() => setFlash(false), 180);

    const result = await captureGamePhoto(ctx, closePhone);
    if (result.ok && result.dataUrl) {
      setThumb(result.dataUrl);
      setHint("已保存到「相机胶卷」");
    } else if (result.error === "busy") {
      setHint("请稍候再拍");
    } else {
      setHint("拍照失败，请重试");
      console.warn("[phone-album] 拍照失败", result.error);
    }
    setBusy(false);
  }, [busy, closePhone, ctx]);

  return (
    <div className="pa-camera">
      <header className="pa-camera-top">
        <div className="pa-camera-top-title">
          <i className="fa-solid fa-camera" aria-hidden="true" />
          <span>拍照</span>
        </div>
        <p className="pa-camera-hint">{hint}</p>
      </header>

      <div className="pa-camera-viewfinder" aria-hidden="true">
        <div className="pa-camera-grid">
          <span /><span /><span />
          <span /><span /><span />
          <span /><span /><span />
        </div>
        <div className="pa-camera-frame" />
        {flash ? <div className="pa-camera-flash" /> : null}
      </div>

      <div className="pa-camera-controls">
        <button
          type="button"
          className="pa-camera-thumb"
          disabled={!thumb}
          onClick={() => onOpenCameraRoll?.()}
          aria-label="打开相机胶卷"
          title="相机胶卷"
        >
          {thumb ? (
            <img src={thumb} alt="" />
          ) : (
            <i className="fa-regular fa-image" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          className={`pa-shutter${busy ? " is-busy" : ""}`}
          onClick={() => {
            void onShutter();
          }}
          disabled={busy}
          aria-label="拍照"
        >
          <span className="pa-shutter-ring" />
          <span className="pa-shutter-core" />
        </button>

        <div className="pa-camera-controls-spacer" data-album={CAMERA_ALBUM_ID} />
      </div>
    </div>
  );
}
