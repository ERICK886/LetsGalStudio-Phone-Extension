/**
 * @file settings.ts
 * @description 从扩展设置读取默认相册 / 默认媒体 / 文案，并缓存供内页 UI 读取。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * 内页 React 树在宿主 Phone 中渲染时，`useExtensionContext()` 是宿主上下文，
 * 不能直接 `settings.get` 本扩展字段；请用 `cacheAuthorSettings` + `getCachedAuthorSettings`。
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import type {
  AlbumAuthorSettings,
  DefaultAlbumSeed,
  DefaultMediaSeed,
  MediaType,
} from "../types.js";
import { parseCommaIds, parseMediaType } from "../domain/index.js";

/** 文案默认值。 */
const DEFAULT_LABELS = {
  appTitle: "相册",
  allAlbumsLabel: "全部",
  emptyAlbumHint: "这里还没有照片",
} as const;

/** 字符串字段规范化：非字符串 / 空白回落到 fallback，并截断到 max。 */
function nonEmpty(value: unknown, fallback: string, max = 40): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

/** 解析默认相册设置行：`id` / `name` 必填；`coverAsset` 取 `asset` 字段，空则省略。 */
function parseDefaultAlbum(row: unknown): DefaultAlbumSeed | null {
  if (!row || typeof row !== "object") return null;
  const raw = row as { id?: unknown; name?: unknown; asset?: unknown };
  const id = nonEmpty(raw.id, "");
  if (id === "") return null;
  const name = nonEmpty(raw.name, id);
  const asset = typeof raw.asset === "string" ? raw.asset.trim() : "";
  const seed: DefaultAlbumSeed = { id, name };
  if (asset !== "") seed.coverAsset = asset;
  return seed;
}

/** 解析默认媒体设置行：`type` 经 parseMediaType（失败跳过）；`asset` 必填；`albumIds` 用 parseCommaIds。 */
function parseDefaultMedia(row: unknown): DefaultMediaSeed | null {
  if (!row || typeof row !== "object") return null;
  const raw = row as {
    id?: unknown;
    type?: unknown;
    asset?: unknown;
    albumIds?: unknown;
    durationSec?: unknown;
  };
  const id = nonEmpty(raw.id, "");
  if (id === "") return null;
  const type = parseMediaType(raw.type) as MediaType | null;
  if (type === null) return null;
  const asset = typeof raw.asset === "string" ? raw.asset.trim() : "";
  if (asset === "") return null;
  const albumIds = parseCommaIds(raw.albumIds);
  const seed: DefaultMediaSeed = { id, type, asset, albumIds };
  if (typeof raw.durationSec === "number" && Number.isFinite(raw.durationSec)) {
    seed.durationSec = raw.durationSec;
  }
  return seed;
}

/**
 * 读取并规范化作者设置。
 *
 * @param ctx - 扩展上下文（方法内为本扩展 scope；内页为宿主 scope 时勿用本函数读设置）
 * @returns AlbumAuthorSettings
 *
 * @example
 * ```ts
 * const settings = readAuthorSettings(ctx);
 * cacheAuthorSettings(settings);
 * ```
 */
export function readAuthorSettings(ctx: ExtensionContext): AlbumAuthorSettings {
  const albumRows = ctx.settings.get<unknown[]>("defaultAlbums") ?? [];
  const defaultAlbums: DefaultAlbumSeed[] = [];
  const seenAlbum = new Set<string>();
  for (const row of albumRows) {
    const seed = parseDefaultAlbum(row);
    if (!seed || seenAlbum.has(seed.id)) continue;
    seenAlbum.add(seed.id);
    defaultAlbums.push(seed);
  }

  const mediaRows = ctx.settings.get<unknown[]>("defaultMedia") ?? [];
  const defaultMedia: DefaultMediaSeed[] = [];
  const seenMedia = new Set<string>();
  for (const row of mediaRows) {
    const seed = parseDefaultMedia(row);
    if (!seed || seenMedia.has(seed.id)) continue;
    seenMedia.add(seed.id);
    defaultMedia.push(seed);
  }

  return {
    appTitle: nonEmpty(ctx.settings.get("appTitle"), DEFAULT_LABELS.appTitle),
    allAlbumsLabel: nonEmpty(
      ctx.settings.get("allAlbumsLabel"),
      DEFAULT_LABELS.allAlbumsLabel,
    ),
    emptyAlbumHint: nonEmpty(
      ctx.settings.get("emptyAlbumHint"),
      DEFAULT_LABELS.emptyAlbumHint,
      120,
    ),
    defaultAlbums,
    defaultMedia,
  };
}

let cachedSettings: AlbumAuthorSettings = {
  appTitle: DEFAULT_LABELS.appTitle,
  allAlbumsLabel: DEFAULT_LABELS.allAlbumsLabel,
  emptyAlbumHint: DEFAULT_LABELS.emptyAlbumHint,
  defaultAlbums: [],
  defaultMedia: [],
};

/**
 * 在方法 / onRegister 中缓存设置，供内页 UI 读取。
 *
 * @param settings - 规范化后的作者设置
 */
export function cacheAuthorSettings(settings: AlbumAuthorSettings): void {
  cachedSettings = {
    ...settings,
    defaultAlbums: settings.defaultAlbums.map((d) => ({ ...d })),
    defaultMedia: settings.defaultMedia.map((d) => ({ ...d })),
  };
}

/**
 * 读取缓存的作者设置（内页用）。
 *
 * @returns AlbumAuthorSettings 拷贝
 */
export function getCachedAuthorSettings(): AlbumAuthorSettings {
  return {
    ...cachedSettings,
    defaultAlbums: cachedSettings.defaultAlbums.map((d) => ({ ...d })),
    defaultMedia: cachedSettings.defaultMedia.map((d) => ({ ...d })),
  };
}
