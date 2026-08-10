/**
 * @file save-fields.ts
 * @description 相册内页存档字段定义（带 `album` 前缀），供宿主
 *              `StudioPhoneExtension` 在 `static saveSchema` 中合并。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 字段名一律以 `album` 前缀，避免与宿主手机壳存档（`preferences`、`appAvailability`）
 *   或聊天模块存档（`chat*`）冲突。
 * - `runtime/store.ts` 的 `bindAlbumSave` 通过键映射适配器把逻辑名
 *   （`albumsExtra` 等）翻译为这些 `album*` 存档键。
 * - 类型与 `defineSave` 一致：`type`/`persistence`/`default`/`label`。
 *
 * @warning 旧键 `albumMedia` 与新键 `albumMedia`（原 `media`）易混——
 *   **原 `media` → `albumMedia`，原 `albumMedia` → `albumMediaLinks`**。
 */

import type { SaveSchema } from "@avg-studio/sdk";

import type { AlbumMedia, AlbumMediaLink, AlbumMeta } from "./types";

/**
 * 相册内页存档字段（带 `album` 前缀）。
 *
 * @remarks
 * 由宿主在 `static saveSchema = defineSave({ ...phoneHostSaveSchema, ...albumSaveSchemaFields })`
 * 中合并；运行时 `this.save.get("albumMedia")` 等由 store 适配器代为访问。
 */
export const albumSaveSchemaFields = {
  albumAlbumsExtra: {
    type: "list",
    persistence: "slot",
    default: [] as string[],
    label: "动态相册 id",
  },
  albumAlbumsRemoved: {
    type: "list",
    persistence: "slot",
    default: [] as string[],
    label: "已移除默认相册",
  },
  albumAlbumsMeta: {
    type: "list",
    persistence: "slot",
    default: [] as AlbumMeta[],
    label: "相册元数据",
  },
  albumMedia: {
    type: "list",
    persistence: "slot",
    default: [] as AlbumMedia[],
    label: "动态媒体库",
  },
  albumMediaLinks: {
    type: "list",
    persistence: "slot",
    default: [] as AlbumMediaLink[],
    label: "相册-媒体归属",
  },
  albumMediaRemoved: {
    type: "list",
    persistence: "slot",
    default: [] as string[],
    label: "已移除默认媒体",
  },
  albumCameraMedia: {
    type: "list",
    persistence: "shared",
    default: [] as AlbumMedia[],
    label: "相机胶卷媒体",
  },
  albumCameraAlbumMedia: {
    type: "list",
    persistence: "shared",
    default: [] as AlbumMediaLink[],
    label: "相机胶卷归属",
  },
  albumCameraAlbumsMeta: {
    type: "list",
    persistence: "shared",
    default: [] as AlbumMeta[],
    label: "相机相册元数据",
  },
} as const satisfies SaveSchema;

/**
 * 逻辑存档名 → `album` 前缀存档键的映射。
 *
 * @remarks
 * `runtime/store.ts` 的 `bindAlbumSave` 用它构造键映射适配器，使领域层
 * （`actions.ts` 等）继续使用逻辑名 `albumsExtra` / `media` / `albumMedia` 等，
 * 而实际读写落到宿主 save 的 `album*` 键上。
 *
 * @warning 逻辑名 `media` → 存档键 `albumMedia`；逻辑名 `albumMedia` → 存档键 `albumMediaLinks`。
 */
export const ALBUM_SAVE_KEY_MAP = {
  albumsExtra: "albumAlbumsExtra",
  albumsRemoved: "albumAlbumsRemoved",
  albumsMeta: "albumAlbumsMeta",
  media: "albumMedia",
  albumMedia: "albumMediaLinks",
  mediaRemoved: "albumMediaRemoved",
  cameraMedia: "albumCameraMedia",
  cameraAlbumMedia: "albumCameraAlbumMedia",
  cameraAlbumsMeta: "albumCameraAlbumsMeta",
} as const;

/** 逻辑存档键集合（用于类型约束与遍历）。 */
export type AlbumSaveLogicalKey = keyof typeof ALBUM_SAVE_KEY_MAP;
