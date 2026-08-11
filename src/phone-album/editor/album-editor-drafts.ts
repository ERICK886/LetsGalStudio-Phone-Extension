/**
 * @file album-editor-drafts.ts
 * @description 相册编辑会话中尚未填写素材 URI 的媒体草稿。
 */

import type { EditableDefaultMedia } from "./media-bridge.ts";

let pendingMedia: EditableDefaultMedia[] = [];

/** 返回当前会话尚未持久化的媒体草稿。 */
export function listPendingDefaultMedia(): readonly EditableDefaultMedia[] {
  return pendingMedia;
}

/** 将持久化媒体与草稿合并，草稿优先以保留用户正在编辑的内容。 */
export function mergePendingDefaultMedia(
  persisted: readonly EditableDefaultMedia[],
): EditableDefaultMedia[] {
  const pendingIds = new Set(pendingMedia.map((row) => row.id));
  return [
    ...persisted.filter((row) => !pendingIds.has(row.id)),
    ...pendingMedia,
  ];
}

/** 新增或更新一条待填写素材的媒体草稿。 */
export function upsertPendingDefaultMedia(row: EditableDefaultMedia): void {
  const index = pendingMedia.findIndex((item) => item.uid === row.uid);
  if (index < 0) {
    pendingMedia = [...pendingMedia, row];
    return;
  }
  pendingMedia = pendingMedia.map((item, itemIndex) =>
    itemIndex === index ? row : item,
  );
}

/** 移除已持久化或被删除的草稿。 */
export function removePendingDefaultMedia(uid: string): void {
  pendingMedia = pendingMedia.filter((row) => row.uid !== uid);
}

/** 仅供测试或编辑器卸载时清空会话草稿。 */
export function clearPendingDefaultMedia(): void {
  pendingMedia = [];
}
