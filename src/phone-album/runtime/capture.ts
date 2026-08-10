/**
 * @file capture.ts
 * @description ???? UI ? ?????? ? ?? UI ? ???????
 * @author ?????
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * ?????
 * 1) WebGL `canvas.toDataURL` ??????????????????
 * 2) `closePhone` ?????????????
 *
 * ????? CSS ??? `[data-phone-root]`???????+ ??
 * `cacheGameSnapshot`?Electron capturePage??? WebGL??????????????
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import { closePhoneApp, openPhoneApp } from "@ink-zenly/phone-sdk/plugin";

import {
  CAMERA_ALBUM_ID,
  CAPTURE_TEMP_SLOT,
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

/** ????? */
export interface CapturePhotoResult {
  ok: boolean;
  mediaId?: string;
  dataUrl?: string;
  error?: string;
}

/** ??????????? UI?????????? */
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

/** ?????????????0?255?? */
const BLACK_LUMA_THRESHOLD = 8;

const SOFT_HIDE_STYLE_ID = "ink.zenly.ext-7a9373-phone-album-capture-hide";

/**
 * ????????
 *
 * @param frames - ??
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
 * @param ms - ??
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * ????????????????? React ??????????
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

/** ???????? */
function clearSoftHideOverlays(): void {
  if (typeof document === "undefined") return;
  document.getElementById(SOFT_HIDE_STYLE_ID)?.remove();
}

/**
 * ?? Data URL ??????? 48×48 ?? RGB ????
 *
 * @param dataUrl - ?? Data URL
 * @returns 0?255???? 0
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
 * ???????WebGL ??? / ????????
 *
 * @param dataUrl - ?? Data URL
 */
async function isMostlyBlack(dataUrl: string): Promise<boolean> {
  const luma = await sampleAverageLuma(dataUrl);
  const black = luma < BLACK_LUMA_THRESHOLD;
  if (black) {
    console.warn("[phone-album] ??????????", { luma: luma.toFixed(2) });
  }
  return black;
}

/**
 * ???????? Data URL????? null?
 *
 * @param dataUrl - ??
 * @param label - ???????
 */
async function acceptFrame(
  dataUrl: string | null | undefined,
  label: string,
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return null;
  if (await isMostlyBlack(dataUrl)) {
    console.warn(`[phone-album] ${label} ????`);
    return null;
  }
  console.info(`[phone-album] ${label} ????`, { chars: dataUrl.length });
  return dataUrl;
}

/**
 * ? Data URL ?? JPEG????????
 *
 * @param dataUrl - ?? Data URL
 * @param maxEdge - ?????
 * @param quality - JPEG ?? 0?1
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
        canvas.width = w;
        canvas.height = h;
        const ctx2d = canvas.getContext("2d");
        if (!ctx2d) {
          resolve(dataUrl);
          return;
        }
        ctx2d.drawImage(img, 0, 0, w, h);
        let out = canvas.toDataURL("image/jpeg", quality);
        if (out.length > MAX_PHOTO_DATA_URL_CHARS) {
          out = canvas.toDataURL("image/jpeg", 0.65);
        }
        resolve(out);
      } catch (error) {
        console.warn("[phone-album] compressDataUrl ??", error);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * ????? / Electron ??????
 *
 * @param ctx - ?????
 */
async function tryHostCapture(ctx: ExtensionContext): Promise<string | null> {
  const host = ctx.getHost() as Record<string, unknown> | null;
  if (!host || typeof host !== "object") return null;

  const candidates = [
    host.captureScreenshot,
    host.capturePage,
    host.takeScreenshot,
    (host as { screenshot?: unknown }).screenshot,
  ];
  for (const fn of candidates) {
    if (typeof fn !== "function") continue;
    try {
      const result = await (fn as () => Promise<unknown>).call(host);
      if (typeof result === "string" && result.startsWith("data:image/")) {
        return acceptFrame(result, "host");
      }
      if (result && typeof result === "object") {
        const raw = result as { dataUrl?: unknown; dataURI?: unknown };
        if (typeof raw.dataUrl === "string") {
          return acceptFrame(raw.dataUrl, "host");
        }
        if (typeof raw.dataURI === "string") {
          return acceptFrame(raw.dataURI, "host");
        }
      }
    } catch (error) {
      console.warn("[phone-album] ??????", error);
    }
  }
  return null;
}

/**
 * ????? canvas ????????? canvas???????
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
      console.warn("[phone-album] canvas ????", error);
    }
  }
  return null;
}

/**
 * ???? `cacheGameSnapshot`?????? `snapshotDataUri`?????
 *
 * @param ctx - ?????
 */
async function tryArchiveSnapshotCapture(
  ctx: ExtensionContext,
): Promise<string | null> {
  try {
    await waitFrames(2);
    await ctx.archive.cacheGameSnapshot();
    const saved = await ctx.archive.save(CAPTURE_TEMP_SLOT, {
      confirmOverwrite: false,
    });
    if (!saved) {
      console.warn("[phone-album] ?????????????????");
      return null;
    }
    const slots = await ctx.archive.list();
    const slot = slots.find((item) => item.id === CAPTURE_TEMP_SLOT);
    const dataUri =
      typeof slot?.snapshotDataUri === "string" ? slot.snapshotDataUri : "";
    try {
      await ctx.archive.delete(CAPTURE_TEMP_SLOT);
    } catch (error) {
      console.warn("[phone-album] ?????????", error);
    }
    try {
      ctx.archive.clearGameSnapshot();
    } catch {
      /* ignore */
    }
    return acceptFrame(dataUri, "archive-snapshot");
  } catch (error) {
    console.warn("[phone-album] ??????????", error);
    return null;
  }
}

/**
 * ??????????? UI id?
 *
 * @param ctx - ?????
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
 * ????????? CSS ?? + ???? + ????? UI???? phone??
 *
 * @param ctx - ?????
 * @returns ?????? UI id
 */
async function softHideOverlays(ctx: ExtensionContext): Promise<string[]> {
  const visible = listVisibleKnownUis(ctx);
  applySoftHideOverlays();
  try {
    ctx.dialogue.hideBox();
  } catch (error) {
    console.warn("[phone-album] hideBox ??", error);
  }
  for (const id of visible) {
    if (id === "phone" || id === "phone-toast") continue;
    try {
      await Promise.resolve(ctx.ui.hide(id));
    } catch (error) {
      console.warn("[phone-album] hide UI ??", id, error);
    }
  }
  await waitFrames(3);
  await delay(120);
  await waitFrames(2);
  return visible;
}

/**
 * ??????????????????????
 *
 * @param ctx - ?????
 * @param visibleBefore - ?????? UI id
 */
async function softRestoreOverlays(
  ctx: ExtensionContext,
  visibleBefore: string[],
): Promise<void> {
  clearSoftHideOverlays();
  try {
    ctx.dialogue.showBox();
  } catch (error) {
    console.warn("[phone-album] showBox ??", error);
  }
  for (const id of visibleBefore) {
    if (id === "phone" || id === "phone-toast") continue;
    try {
      await Promise.resolve(ctx.ui.show(id));
    } catch (error) {
      console.warn("[phone-album] ?? UI ??", id, error);
    }
  }
}

/**
 * ??????????????????????? openPhoneApp??
 *
 * @param ctx - ?????
 * @param closePhone - ??????????
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
    console.warn("[phone-album] hideBox ??", error);
  }
  try {
    await closePhoneApp();
  } catch (error) {
    console.warn("[phone-album] closePhoneApp ????? closePhone", error);
    try {
      closePhone();
    } catch (fallbackError) {
      console.warn("[phone-album] closePhone ??", fallbackError);
    }
  }
  try {
    await Promise.resolve(ctx.ui.hideAll());
  } catch (error) {
    console.warn("[phone-album] ui.hideAll ??", error);
  }
  await waitFrames(4);
  await delay(280);
  await waitFrames(2);
  return visible;
}

/**
 * ????????????????? Tab?
 *
 * @param ctx - ?????
 * @param visibleBefore - ?????? UI id
 */
async function hardRestoreOverlays(
  ctx: ExtensionContext,
  visibleBefore: string[],
): Promise<void> {
  clearSoftHideOverlays();
  try {
    ctx.dialogue.showBox();
  } catch (error) {
    console.warn("[phone-album] showBox ??", error);
  }
  for (const id of visibleBefore) {
    if (id === "phone" || id === "phone-toast") continue;
    try {
      await Promise.resolve(ctx.ui.show(id));
    } catch (error) {
      console.warn("[phone-album] ?? UI ??", id, error);
    }
  }
  setResumeTab("camera");
  try {
    await openPhoneApp({ appId: PROGRAM_ID, waitUntil: "none" });
  } catch (error) {
    console.warn("[phone-album] openPhoneApp ????", error);
  }
}

/**
 * ??????????????????
 *
 * @param ctx - ?????
 */
async function captureFrame(ctx: ExtensionContext): Promise<string | null> {
  const fromArchive = await tryArchiveSnapshotCapture(ctx);
  if (fromArchive) return fromArchive;

  const fromHost = await tryHostCapture(ctx);
  if (fromHost) return fromHost;

  await waitFrames(2);
  const fromCanvas = await tryCanvasCapture();
  if (fromCanvas) return fromCanvas;

  return null;
}

/**
 * ???????? UI ? ?? ? ?? ? ???????
 *
 * @param ctx - ?????????? useExtensionContext?
 * @param closePhone - ?????????????
 * @returns CapturePhotoResult
 */
export async function captureGamePhoto(
  ctx: ExtensionContext,
  closePhone: () => void,
): Promise<CapturePhotoResult> {
  if (isCaptureBusy()) {
    return { ok: false, error: "busy" };
  }
  setCaptureBusy(true);
  setResumeTab("camera");

  let visibleBefore: string[] = [];
  let usedHardClose = false;

  try {
    // ? ??????????????? ? ????????
    visibleBefore = await softHideOverlays(ctx);
    let raw = await captureFrame(ctx);

    // ? ?????/?? ? ???????
    if (!raw) {
      console.warn("[phone-album] ?????????????");
      usedHardClose = true;
      visibleBefore = await hardHideOverlays(ctx, closePhone);
      raw = await captureFrame(ctx);
    }

    if (!raw) {
      if (usedHardClose) {
        await hardRestoreOverlays(ctx, visibleBefore);
      } else {
        await softRestoreOverlays(ctx, visibleBefore);
      }
      return { ok: false, error: "capture-failed" };
    }

    const dataUrl = await compressDataUrl(raw);
    if (!dataUrl.startsWith("data:image/") || (await isMostlyBlack(dataUrl))) {
      if (usedHardClose) {
        await hardRestoreOverlays(ctx, visibleBefore);
      } else {
        await softRestoreOverlays(ctx, visibleBefore);
      }
      return { ok: false, error: "invalid-image" };
    }

    const mediaId = `shot-${Date.now()}`;
    const persisted = executeAddCameraPhoto({
      id: mediaId,
      type: "image",
      asset: dataUrl,
      createdAt: Date.now(),
    });
    if (!persisted && !hasAlbumSave()) {
      console.error(
        "[phone-album] ??????????save ????????????????????????",
      );
    } else {
      try {
        // shared ???? debounce??????????????????
        await ctx.archive.flushShared();
      } catch (error) {
        console.warn("[phone-album] flushShared ??", error);
      }
    }
    rememberLastShot(dataUrl, mediaId);
    console.info("[phone-album] ???????", {
      mediaId,
      albumId: CAMERA_ALBUM_ID,
      persisted,
      chars: dataUrl.length,
    });

    if (usedHardClose) {
      await hardRestoreOverlays(ctx, visibleBefore);
    } else {
      await softRestoreOverlays(ctx, visibleBefore);
    }
    return { ok: true, mediaId, dataUrl };
  } catch (error) {
    console.error("[phone-album] captureGamePhoto ??", error);
    clearSoftHideOverlays();
    try {
      if (usedHardClose) {
        await hardRestoreOverlays(ctx, visibleBefore);
      } else {
        await softRestoreOverlays(ctx, visibleBefore);
      }
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown",
    };
  } finally {
    setCaptureBusy(false);
  }
}
