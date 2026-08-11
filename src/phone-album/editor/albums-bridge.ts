/**
 * @file albums-bridge.ts
 * @description 编辑器：读写 phone-album.defaultAlbums。
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
  createBlankDefaultAlbum,
  parseEditableDefaultAlbums,
  serializeEditableDefaultAlbums,
  type EditableDefaultAlbum,
} from "./albums-bridge-core.ts";

export type { EditableDefaultAlbum } from "./albums-bridge-core.ts";
export {
  createBlankDefaultAlbum,
  parseEditableDefaultAlbums,
  serializeEditableDefaultAlbums,
} from "./albums-bridge-core.ts";

/**
 * 读取默认相册列表。
 *
 * @param ctx - 扩展上下文
 * @returns 相册行
 */
export function readEditableDefaultAlbums(
  ctx: ExtensionContext,
): EditableDefaultAlbum[] {
  const raw = readModuleSetting(ctx, ALBUM_SETTINGS_MODULE_ID, "defaultAlbums");
  return parseEditableDefaultAlbums(raw);
}

/**
 * 写入 defaultAlbums（不含 uid）。
 *
 * @param ctx - 扩展上下文
 * @param rows - 相册行
 * @returns 是否成功
 */
export function writeEditableDefaultAlbums(
  ctx: ExtensionContext,
  rows: readonly EditableDefaultAlbum[],
): boolean {
  return writeModuleSetting(
    ctx,
    ALBUM_SETTINGS_MODULE_ID,
    "defaultAlbums",
    serializeEditableDefaultAlbums(rows),
  );
}
