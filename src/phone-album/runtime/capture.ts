/**
 * @file capture.ts
 * @description 隐藏手机覆盖层、捕获当前游戏画面并把照片保存到相机胶卷。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * 捕获顺序：
 * 1) 使用公开的存档快照 API 读取游戏截图。
 * 2) 回退到游戏 Canvas；必要时先关闭手机再重试。
 *
 * 优先用临时 CSS 隐藏手机与提示层，尽量避免销毁 React 状态。
 * 所有临时存档都先寻找未占用槽位，并在 finally 中清理。
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import { closePhoneApp, openPhoneApp } from "@ink-zenly/phone-sdk/plugin";

import {
  CAMERA_ALBUM_ID,
  MAX_PHOTO_DATA_URL_CHARS,
  PROGRAM_ID,
} from "../constants";
import { executeAddCameraPhoto } from "./actions";
import {
  isCaptureBusy,
  rememberLastShot,
  setCaptureBusy,
  setResumeTab,
} from "./camera-session";
import { hasAlbumSave } from "./store";
import { getAlbumRuntimeKey } from "./runtime-key";
import { chooseCaptureTempSlot } from "./capture-slot";

/** 拍照结果。 */
export interface CapturePhotoResult {
  ok: boolean;
  mediaId?: string;
  dataUrl?: string;
  error?: string;
  warning?: string;
}

/** 可能遮挡游戏画面的已知 UI；恢复时仅重新显示拍照前可见的条目。 */
const KNOWN_UI_IDS = [
  "phone",
  "phone-toast",
  "toast",
  "settings",
  "save",
  "load",
  "history",
  "gallery",
  "toolbar",
] as const;

/** 黑屏检测亮度阈值（0 到 255）。 */
const BLACK_LUMA_THRESHOLD = 8;

const SOFT_HIDE_STYLE_ID = "ink.zenly.ext-7a9373-phone-album-capture-hide";

function assertCaptureActive(ctx: ExtensionContext): void {
  if (ctx.flow.signal.aborted) throw new Error("capture-cancelled");
}

/**
 * 等待若干浏览器绘制帧。
 *
 * @param frames - 帧数
 */
function waitFrames(frames: number): Promise<void> {
  return new Promise((resolve) => {
    let left = Math.max(1, frames);
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/**
 * @param ms - 毫秒
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 用透明样式临时隐藏手机层，不卸载 React 树。
 */
function applySoftHideOverlays(): void {
  if (typeof document === "undefined") return;
  let style = document.getElementById(
    SOFT_HIDE_STYLE_ID,
  ) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = SOFT_HIDE_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
    [data-phone-root],
    .phone-shell,
    [data-phone-toast],
    .phone-toast-root {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
}

/** 移除临时隐藏样式。 */
function clearSoftHideOverlays(): void {
  if (typeof document === "undefined") return;
  document.getElementById(SOFT_HIDE_STYLE_ID)?.remove();
}

/**
 * 将 Data URL 缩放到 48 x 48 后计算平均 RGB 亮度。
 *
 * @param dataUrl - 图片 Data URL
 * @returns 0 到 255；无法读取时返回 0
 */
function sampleAverageLuma(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(0);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx2d = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx2d) {
          resolve(0);
          return;
        }
        ctx2d.drawImage(img, 0, 0, size, size);
        const { data } = ctx2d.getImageData(0, 0, size, size);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 8) continue;
          sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
          count += 1;
        }
        resolve(count > 0 ? sum / count : 0);
      } catch {
        resolve(0);
      }
    };
    img.onerror = () => resolve(0);
    img.src = dataUrl;
  });
}

/**
 * 检测 WebGL 读取失败或捕获时机错误产生的纯黑图。
 *
 * @param dataUrl - 图片 Data URL
 */
async function isMostlyBlack(dataUrl: string): Promise<boolean> {
  const luma = await sampleAverageLuma(dataUrl);
  const black = luma < BLACK_LUMA_THRESHOLD;
  if (black) {
    console.warn("[phone-album] 捕获结果接近纯黑", { luma: luma.toFixed(2) });
  }
  return black;
}

/**
 * 验证候选 Data URL；格式错误或近黑时返回 null。
 *
 * @param dataUrl - 候选截图
 * @param label - 捕获来源标签
 */
async function acceptFrame(
  dataUrl: string | null | undefined,
  label: string,
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return null;
  if (await isMostlyBlack(dataUrl)) {
    console.warn(`[phone-album] ${label} 捕获结果无效`);
    return null;
  }
  console.info(`[phone-album] ${label} 捕获成功`, { chars: dataUrl.length });
  return dataUrl;
}

/**
 * 将 Data URL 转为 JPEG，并逐步降低尺寸与质量直到符合存档上限。
 *
 * @param dataUrl - 原始 Data URL
 * @param maxEdge - 最长边像素
 * @param quality - 初始 JPEG 质量（0 到 1）
 */
function compressDataUrl(
  dataUrl: string,
  maxEdge = 1280,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          maxEdge / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
        );
        const w = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
        const h = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
        const canvas = document.createElement("canvas");
        const ctx2d = canvas.getContext("2d");
        if (!ctx2d) {
          resolve(dataUrl);
          return;
        }

        let shortest = dataUrl;
        const scaleSteps = [1, 0.85, 0.7, 0.55, 0.4];
        const qualitySteps = [quality, 0.72, 0.6, 0.48, 0.36];
        for (const scaleStep of scaleSteps) {
          const targetWidth = Math.max(1, Math.round(w * scaleStep));
          const targetHeight = Math.max(1, Math.round(h * scaleStep));
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx2d.drawImage(img, 0, 0, targetWidth, targetHeight);
          for (const qualityStep of qualitySteps) {
            const candidate = canvas.toDataURL("image/jpeg", qualityStep);
            if (candidate.length < shortest.length) shortest = candidate;
            if (candidate.length <= MAX_PHOTO_DATA_URL_CHARS) {
              resolve(candidate);
              return;
            }
          }
        }
        resolve(shortest);
      } catch (error) {
        console.warn("[phone-album] 压缩截图失败", error);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * 从页面 Canvas 中选择面积最大的有效画布作为兜底截图来源。
 */
async function tryCanvasCapture(): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const canvases = Array.from(document.querySelectorAll("canvas"));
  const ranked = canvases
    .map((canvas) => {
      const rect = canvas.getBoundingClientRect();
      const style = window.getComputedStyle(canvas);
      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      const inPhone =
        Boolean(canvas.closest(".pa-root")) ||
        Boolean(canvas.closest("[data-phone-root]")) ||
        Boolean(canvas.closest(".phone-shell"));
      return { canvas, rect, style, area, inPhone };
    })
    .filter((item) => {
      if (item.inPhone) return false;
      if (item.rect.width < 64 || item.rect.height < 64) return false;
      if (item.style.visibility === "hidden" || item.style.display === "none") {
        return false;
      }
      if (Number(item.style.opacity) === 0) return false;
      return item.area > 0;
    })
    .sort((a, b) => b.area - a.area);

  for (const item of ranked) {
    try {
      const src = item.canvas;
      const w = src.width || Math.round(item.rect.width);
      const h = src.height || Math.round(item.rect.height);
      if (w < 8 || h < 8) continue;

      const copy = document.createElement("canvas");
      copy.width = w;
      copy.height = h;
      const ctx2d = copy.getContext("2d");
      if (!ctx2d) continue;
      ctx2d.drawImage(src, 0, 0, w, h);
      const dataUrl = copy.toDataURL("image/jpeg", 0.9);
      const ok = await acceptFrame(dataUrl, "canvas-copy");
      if (ok) return ok;

      const direct = src.toDataURL("image/jpeg", 0.9);
      const okDirect = await acceptFrame(direct, "canvas-direct");
      if (okDirect) return okDirect;
    } catch (error) {
      console.warn("[phone-album] Canvas 截图失败", error);
    }
  }
  return null;
}

/**
 * 通过 `cacheGameSnapshot` 与临时空闲存档槽读取官方截图缓存。
 *
 * @param ctx - 扩展上下文
 */
async function tryArchiveSnapshotCapture(
  ctx: ExtensionContext,
): Promise<string | null> {
  let tempSlot: number | undefined;
  let saved = false;
  try {
    await waitFrames(2);
    await ctx.archive.cacheGameSnapshot();

    tempSlot = chooseCaptureTempSlot(
      (await ctx.archive.list()).map((slot) => slot.id),
    );

    saved = await ctx.archive.save(tempSlot, {
      confirmOverwrite: false,
    });
    if (!saved) {
      console.warn("[phone-album] 临时截图存档未能写入");
      return null;
    }
    const slots = await ctx.archive.list();
    const slot = slots.find((item) => item.id === tempSlot);
    const dataUri =
      typeof slot?.snapshotDataUri === "string" ? slot.snapshotDataUri : "";
    return acceptFrame(dataUri, "archive-snapshot");
  } catch (error) {
    console.warn("[phone-album] 官方存档截图捕获失败", error);
    return null;
  } finally {
    if (saved && tempSlot !== undefined) {
      try {
        await ctx.archive.delete(tempSlot);
      } catch (error) {
        console.warn("[phone-album] 临时截图存档清理失败", error);
      }
    }
    try {
      ctx.archive.clearGameSnapshot();
    } catch {
      /* 宿主销毁时清理可能失败，无需阻断后续恢复。 */
    }
  }
}

/**
 * 返回当前可见的已知 UI id。
 *
 * @param ctx - 扩展上下文
 */
function listVisibleKnownUis(ctx: ExtensionContext): string[] {
  const out: string[] = [];
  for (const id of KNOWN_UI_IDS) {
    try {
      if (ctx.ui.isVisible(id)) out.push(id);
    } catch {
      /* ignore */
    }
  }
  return out;
}

/**
 * 软隐藏：隐藏对话框和已知 UI，并用 CSS 隐藏手机，但保持手机 React 树挂载。
 *
 * @param ctx - 扩展上下文
 * @returns 隐藏前可见的 UI id
 */
async function softHideOverlays(ctx: ExtensionContext): Promise<string[]> {
  const visible = listVisibleKnownUis(ctx);
  applySoftHideOverlays();
  try {
    ctx.dialogue.hideBox();
  } catch (error) {
    console.warn("[phone-album] 隐藏对话框失败", error);
  }
  for (const id of visible) {
    if (id === "phone" || id === "phone-toast") continue;
    try {
      await Promise.resolve(ctx.ui.hide(id));
    } catch (error) {
      console.warn("[phone-album] 隐藏 UI 失败", id, error);
    }
  }
  await waitFrames(3);
  await delay(120);
  await waitFrames(2);
  return visible;
}

/**
 * 恢复软隐藏前的对话框和 UI。
 *
 * @param ctx - 扩展上下文
 * @param visibleBefore - 拍照前可见的 UI id
 */
async function softRestoreOverlays(
  ctx: ExtensionContext,
  visibleBefore: string[],
): Promise<void> {
  clearSoftHideOverlays();
  try {
    ctx.dialogue.showBox();
  } catch (error) {
    console.warn("[phone-album] 恢复对话框失败", error);
  }
  for (const id of visibleBefore) {
    if (id === "phone" || id === "phone-toast") continue;
    try {
      await Promise.resolve(ctx.ui.show(id));
    } catch (error) {
      console.warn("[phone-album] 恢复 UI 失败", id, error);
    }
  }
}

/**
 * 硬隐藏：关闭手机并隐藏所有普通 UI；恢复阶段会重新打开相册。
 *
 * @param ctx - 扩展上下文
 * @param closePhone - 手机内页提供的关闭回调
 */
async function hardHideOverlays(
  ctx: ExtensionContext,
  closePhone: () => void,
): Promise<string[]> {
  const visible = listVisibleKnownUis(ctx);
  clearSoftHideOverlays();
  try {
    ctx.dialogue.hideBox();
  } catch (error) {
    console.warn("[phone-album] 隐藏对话框失败", error);
  }
  try {
    await closePhoneApp();
  } catch (error) {
    console.warn("[phone-album] SDK 关闭手机失败，回退内页关闭回调", error);
    try {
      closePhone();
    } catch (fallbackError) {
      console.warn("[phone-album] 内页关闭手机也失败", fallbackError);
    }
  }
  try {
    await Promise.resolve(ctx.ui.hideAll());
  } catch (error) {
    console.warn("[phone-album] 隐藏全部 UI 失败", error);
  }
  await waitFrames(4);
  await delay(280);
  await waitFrames(2);
  return visible;
}

/**
 * 恢复硬隐藏前的 UI，并重新打开相册拍照页。
 *
 * @param ctx - 扩展上下文
 * @param visibleBefore - 拍照前可见的 UI id
 */
async function hardRestoreOverlays(
  ctx: ExtensionContext,
  visibleBefore: string[],
): Promise<boolean> {
  clearSoftHideOverlays();
  if (ctx.flow.signal.aborted) return false;
  try {
    ctx.dialogue.showBox();
  } catch (error) {
    console.warn("[phone-album] 恢复对话框失败", error);
  }
  for (const id of visibleBefore) {
    if (id === "phone" || id === "phone-toast") continue;
    try {
      await Promise.resolve(ctx.ui.show(id));
    } catch (error) {
      console.warn("[phone-album] 恢复 UI 失败", id, error);
    }
  }
  setResumeTab(getAlbumRuntimeKey(ctx), "camera");
  try {
    const result = await openPhoneApp({ appId: PROGRAM_ID, waitUntil: "none" });
    if (result === "opened") return true;
    console.warn("[phone-album] 手机恢复未完成", { result });
    return false;
  } catch (error) {
    console.warn("[phone-album] 重新打开相册失败", error);
    return false;
  }
}

/**
 * 按公开存档截图、Canvas 的顺序捕获游戏画面。
 *
 * @param ctx - 扩展上下文
 */
async function captureFrame(ctx: ExtensionContext): Promise<string | null> {
  const fromArchive = await tryArchiveSnapshotCapture(ctx);
  if (fromArchive) return fromArchive;

  await waitFrames(2);
  const fromCanvas = await tryCanvasCapture();
  if (fromCanvas) return fromCanvas;

  return null;
}

/**
 * 执行完整拍照事务：隐藏 UI、截图、压缩、写入 shared 存档并恢复手机。
 *
 * @param ctx - 当前手机 Preview 的扩展上下文
 * @param closePhone - 手机内页提供的关闭回调
 * @returns CapturePhotoResult
 */
export async function captureGamePhoto(
  ctx: ExtensionContext,
  closePhone: () => void,
): Promise<CapturePhotoResult> {
  const runtimeKey = getAlbumRuntimeKey(ctx);
  if (isCaptureBusy(runtimeKey)) {
    return { ok: false, error: "busy" };
  }
  setCaptureBusy(runtimeKey, true);
  setResumeTab(runtimeKey, "camera");

  let visibleBefore: string[] = [];
  let usedHardClose = false;

  const restoreUi = async (): Promise<boolean> => {
    if (ctx.flow.signal.aborted) {
      clearSoftHideOverlays();
      return false;
    }
    if (usedHardClose) return hardRestoreOverlays(ctx, visibleBefore);
    await softRestoreOverlays(ctx, visibleBefore);
    return true;
  };

  try {
    assertCaptureActive(ctx);
    visibleBefore = await softHideOverlays(ctx);
    assertCaptureActive(ctx);
    let raw = await captureFrame(ctx);
    assertCaptureActive(ctx);

    if (!raw) {
      console.warn("[phone-album] 软隐藏截图失败，改用关闭手机后截图");
      usedHardClose = true;
      visibleBefore = await hardHideOverlays(ctx, closePhone);
      assertCaptureActive(ctx);
      raw = await captureFrame(ctx);
      assertCaptureActive(ctx);
    }

    if (!raw) {
      const restored = await restoreUi();
      return {
        ok: false,
        error: restored ? "capture-failed" : "phone-restore-failed",
      };
    }

    const dataUrl = await compressDataUrl(raw);
    assertCaptureActive(ctx);
    if (!dataUrl.startsWith("data:image/") || (await isMostlyBlack(dataUrl))) {
      const restored = await restoreUi();
      return {
        ok: false,
        error: restored ? "invalid-image" : "phone-restore-failed",
      };
    }
    if (dataUrl.length > MAX_PHOTO_DATA_URL_CHARS) {
      console.warn("[phone-album] 截图压缩后仍超过存档上限", {
        chars: dataUrl.length,
        maxChars: MAX_PHOTO_DATA_URL_CHARS,
      });
      const restored = await restoreUi();
      return {
        ok: false,
        error: restored ? "image-too-large" : "phone-restore-failed",
      };
    }

    const mediaId = `shot-${Date.now()}`;
    const persisted = executeAddCameraPhoto(runtimeKey, {
      id: mediaId,
      type: "image",
      asset: dataUrl,
      createdAt: Date.now(),
    });
    if (!persisted && !hasAlbumSave(runtimeKey)) {
      console.error(
        "[phone-album] 相册 save 尚未绑定，照片只写入了临时内存",
      );
    } else {
      try {
        await ctx.archive.flushShared();
      } catch (error) {
        console.warn("[phone-album] 相机胶卷立即落盘失败", error);
      }
    }
    assertCaptureActive(ctx);
    rememberLastShot(runtimeKey, dataUrl, mediaId);
    console.info("[phone-album] 照片已写入相机胶卷", {
      mediaId,
      albumId: CAMERA_ALBUM_ID,
      persisted,
      chars: dataUrl.length,
    });

    const restored = await restoreUi();
    return {
      ok: true,
      mediaId,
      dataUrl,
      ...(restored ? {} : { warning: "phone-restore-failed" }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message !== "capture-cancelled") {
      console.error("[phone-album] 拍照流程失败", error);
    }
    clearSoftHideOverlays();
    if (!ctx.flow.signal.aborted) {
      try {
        await restoreUi();
      } catch {
        /* 恢复失败由调用方收到原始错误。 */
      }
    }
    return {
      ok: false,
      error: message,
    };
  } finally {
    if (!ctx.flow.signal.aborted) setCaptureBusy(runtimeKey, false);
  }
}
