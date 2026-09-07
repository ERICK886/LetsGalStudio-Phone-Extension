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

interface CameraSessionRuntime {
  resumeTab: AlbumMainTab;
  lastShotThumb: string | undefined;
  lastShotMediaId: string | undefined;
  captureBusy: boolean;
}

const sessionsByRuntime = new WeakMap<object, CameraSessionRuntime>();

function sessionFor(runtimeKey: object): CameraSessionRuntime {
  const existing = sessionsByRuntime.get(runtimeKey);
  if (existing) return existing;
  const created: CameraSessionRuntime = {
    resumeTab: "album",
    lastShotThumb: undefined,
    lastShotMediaId: undefined,
    captureBusy: false,
  };
  sessionsByRuntime.set(runtimeKey, created);
  return created;
}

/**
 * 标记重开后应落在哪个 Tab（拍照前设为 `camera`）。
 *
 * @param tab - 主 Tab
 */
export function setResumeTab(runtimeKey: object, tab: AlbumMainTab): void {
  sessionFor(runtimeKey).resumeTab = tab;
}

/**
 * 读取并消费重开 Tab（默认回落 `album`）。
 *
 * @returns 应激活的主 Tab
 */
export function consumeResumeTab(runtimeKey: object): AlbumMainTab {
  const session = sessionFor(runtimeKey);
  const tab = session.resumeTab;
  session.resumeTab = "album";
  return tab;
}

/**
 * 记录最近一张拍摄缩略（Data URL），供相机页角标预览。
 *
 * @param dataUrl - 图片 Data URL
 * @param mediaId - 媒体 id
 */
export function rememberLastShot(
  runtimeKey: object,
  dataUrl: string,
  mediaId: string,
): void {
  const session = sessionFor(runtimeKey);
  session.lastShotThumb = dataUrl;
  session.lastShotMediaId = mediaId;
}

/** @returns 最近一张拍摄缩略 Data URL */
export function getLastShotThumb(runtimeKey: object): string | undefined {
  return sessionFor(runtimeKey).lastShotThumb;
}

/** @returns 最近一张拍摄的媒体 id */
export function getLastShotMediaId(runtimeKey: object): string | undefined {
  return sessionFor(runtimeKey).lastShotMediaId;
}

/**
 * 若删除的正是最近一张拍摄，清空相机页缩略预览。
 *
 * @param mediaId - 被删媒体 id
 */
export function clearLastShotIf(runtimeKey: object, mediaId: string): void {
  const session = sessionFor(runtimeKey);
  if (session.lastShotMediaId === mediaId) {
    session.lastShotMediaId = undefined;
    session.lastShotThumb = undefined;
  }
}

/** @returns 是否正在拍照（防连点） */
export function isCaptureBusy(runtimeKey: object): boolean {
  return sessionFor(runtimeKey).captureBusy;
}

/**
 * 设置拍照忙锁。
 *
 * @param busy - 是否忙碌
 */
export function setCaptureBusy(runtimeKey: object, busy: boolean): void {
  sessionFor(runtimeKey).captureBusy = busy;
}

/** 清理一个 Preview 的拍照短会话。 */
export function disposeCameraSession(runtimeKey: object): void {
  sessionsByRuntime.delete(runtimeKey);
}
