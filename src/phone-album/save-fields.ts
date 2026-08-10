/**
 * @file save-fields.ts
 * @description 相册模块存档字段（本模块独立 saveSchema，无需 album 前缀）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import type { SaveSchema } from "@avg-studio/sdk";

import type { AlbumMedia, AlbumMediaLink, AlbumMeta } from "./types";

/**
 * 相册模块存档字段，供 `PhoneAlbumExtension.static saveSchema` 使用。
 */
export const albumSaveSchemaFields = {
  albumsExtra: {
    type: "list",
    persistence: "slot",
    default: [] as string[],
    label: "动态相册 id",
  },
  albumsRemoved: {
    type: "list",
    persistence: "slot",
    default: [] as string[],
    label: "已移除默认相册",
  },
  albumsMeta: {
    type: "list",
    persistence: "slot",
    default: [] as AlbumMeta[],
    label: "相册元数据",
  },
  media: {
    type: "list",
    persistence: "slot",
    default: [] as AlbumMedia[],
    label: "动态媒体库",
  },
  albumMedia: {
    type: "list",
    persistence: "slot",
    default: [] as AlbumMediaLink[],
    label: "相册-媒体归属",
  },
  mediaRemoved: {
    type: "list",
    persistence: "slot",
    default: [] as string[],
    label: "已移除默认媒体",
  },
  cameraMedia: {
    type: "list",
    persistence: "shared",
    default: [] as AlbumMedia[],
    label: "相机胶卷媒体",
  },
  cameraAlbumMedia: {
    type: "list",
    persistence: "shared",
    default: [] as AlbumMediaLink[],
    label: "相机胶卷归属",
  },
  cameraAlbumsMeta: {
    type: "list",
    persistence: "shared",
    default: [] as AlbumMeta[],
    label: "相机相册元数据",
  },
} as const satisfies SaveSchema;
