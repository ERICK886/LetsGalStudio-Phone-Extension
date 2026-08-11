/**
 * @file media-bridge.ts
 * @description 编辑器：读写 phone-album.defaultMedia。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import {
  readModuleSetting,
  writeModuleSetting,
} from "@ink-zenly/phone-sdk";

import { ALBUM_SETTINGS_MODULE_ID } from "./album-app-editor-schema.ts";
import {
  createBlankDefaultMedia,
  parseEditableDefaultMedia,
  serializeEditableDefaultMedia,
  serializeMediaAlbumIds,
  stripAlbumIdFromMedia,
  type EditableDefaultMedia,
} from "./media-bridge-core.ts";

export type { EditableDefaultMedia } from "./media-bridge-core.ts";
export {
  createBlankDefaultMedia,
  parseEditableDefaultMedia,
  serializeEditableDefaultMedia,
  serializeMediaAlbumIds,
  stripAlbumIdFromMedia,
} from "./media-bridge-core.ts";

/**
 * 读取默认媒体列表。
 *
 * @param ctx - 扩展上下文
 * @returns 媒体行
 */
export function readEditableDefaultMedia(
  ctx: ExtensionContext,
): EditableDefaultMedia[] {
  const raw = readModuleSetting(ctx, ALBUM_SETTINGS_MODULE_ID, "defaultMedia");
  return parseEditableDefaultMedia(raw);
}

/**
 * 写入 defaultMedia（不含 uid；asset 空行跳过）。
 *
 * @param ctx - 扩展上下文
 * @param rows - 媒体行
 * @returns 是否成功
 */
export function writeEditableDefaultMedia(
  ctx: ExtensionContext,
  rows: readonly EditableDefaultMedia[],
): boolean {
  return writeModuleSetting(
    ctx,
    ALBUM_SETTINGS_MODULE_ID,
    "defaultMedia",
    serializeEditableDefaultMedia(rows),
  );
}
