/**
 * @file camera-session.ts
 * @description 拍照流程跨「关手机 → 重开」的短暂会话状态。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * `openPhoneApp` 会重建内页，React state 会丢；用模块级变量在重开后恢复 Tab。
 */

/** 相册内页主 Tab。 */
export type AlbumMainTab = "album" | "camera";

let resumeTab: AlbumMainTab = "album";
let lastShotThumb: string | undefined;
let lastShotMediaId: string | undefined;
let captureBusy = false;

/**
 * 标记重开后应落在哪个 Tab（拍照前设为 `camera`）。
 *
 * @param tab - 主 Tab
 */
export function setResumeTab(tab: AlbumMainTab): void {
  resumeTab = tab;
}

/**
 * 读取并消费重开 Tab（默认回落 `album`）。
 *
 * @returns 应激活的主 Tab
 */
export function consumeResumeTab(): AlbumMainTab {
  const tab = resumeTab;
  resumeTab = "album";
  return tab;
}

/**
 * 记录最近一张拍摄缩略（Data URL），供相机页角标预览。
 *
 * @param dataUrl - 图片 Data URL
 * @param mediaId - 媒体 id
 */
export function rememberLastShot(dataUrl: string, mediaId: string): void {
  lastShotThumb = dataUrl;
  lastShotMediaId = mediaId;
}

/** @returns 最近一张拍摄缩略 Data URL */
export function getLastShotThumb(): string | undefined {
  return lastShotThumb;
}

/** @returns 最近一张拍摄的媒体 id */
export function getLastShotMediaId(): string | undefined {
  return lastShotMediaId;
}

/**
 * 若删除的正是最近一张拍摄，清空相机页缩略预览。
 *
 * @param mediaId - 被删媒体 id
 */
export function clearLastShotIf(mediaId: string): void {
  if (lastShotMediaId === mediaId) {
    lastShotMediaId = undefined;
    lastShotThumb = undefined;
  }
}

/** @returns 是否正在拍照（防连点） */
export function isCaptureBusy(): boolean {
  return captureBusy;
}

/**
 * 设置拍照忙锁。
 *
 * @param busy - 是否忙碌
 */
export function setCaptureBusy(busy: boolean): void {
  captureBusy = busy;
}
