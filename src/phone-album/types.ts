/**
 * @file types.ts
 * @description 手机相册设置、存档与视图模型类型。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.2.0
 */

/** 媒体类型。 */
export type MediaType = "image" | "video";

/** 存档中的媒体条目（动态库；默认媒体不强制写入此数组）。 */
export interface AlbumMedia {
  id: string;
  type: MediaType;
  asset: string;
  createdAt: number;
  durationSec?: number;
  /** 视频封面图（可选）；网格优先使用。 */
  posterAsset?: string;
}

/** 相册元数据（动态相册或覆盖默认相册显示名/封面）。 */
export interface AlbumMeta {
  id: string;
  name: string;
  coverMediaId?: string;
  coverAsset?: string;
}

/** 多对多归属。 */
export interface AlbumMediaLink {
  albumId: string;
  mediaId: string;
}

/** slot 存档状态（与 defineSave 字段一一对应）。 */
export interface AlbumSaveState {
  albumsExtra: string[];
  albumsRemoved: string[];
  albumsMeta: AlbumMeta[];
  media: AlbumMedia[];
  albumMedia: AlbumMediaLink[];
  mediaRemoved: string[];
}

/** 设置中的默认相册行（规范化后）。 */
export interface DefaultAlbumSeed {
  id: string;
  name: string;
  coverAsset?: string;
}

/** 设置中的默认媒体行（规范化后）。 */
export interface DefaultMediaSeed {
  id: string;
  type: MediaType;
  asset: string;
  albumIds: string[];
  durationSec?: number;
  /** 视频封面图（可选）。 */
  posterAsset?: string;
}

/** 作者设置快照。 */
export interface AlbumAuthorSettings {
  appTitle: string;
  allAlbumsLabel: string;
  emptyAlbumHint: string;
  defaultAlbums: DefaultAlbumSeed[];
  defaultMedia: DefaultMediaSeed[];
}

/** UI：相册卡片。 */
export interface AlbumView {
  id: string;
  name: string;
  count: number;
  coverAsset?: string;
  isVirtualAll?: boolean;
}

/** UI：媒体格。 */
export interface MediaView {
  id: string;
  type: MediaType;
  asset: string;
  durationSec?: number;
  /** 视频封面图（可选）。 */
  posterAsset?: string;
}
