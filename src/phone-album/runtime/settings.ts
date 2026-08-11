/**
 * @file settings.ts
 * @description 从本模块设置读取默认相册 / 默认媒体 / 文案，并缓存供内页 UI 读取。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * 多模块模式下本模块有独立 settings 命名空间，字段无前缀。
 * 内页在宿主 Phone 中渲染时勿直接 settings.get；用 cache + getCached。
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import type {
  AlbumAuthorSettings,
  DefaultAlbumSeed,
  DefaultMediaSeed,
  MediaType,
} from "../types";
import { parseCommaIds, parseMediaType } from "../domain/index";
import {
  ALBUM_APPEARANCE_SETTINGS_KEYS,
  DEFAULT_ALBUM_APPEARANCE,
  parseAppearanceFromSettings,
} from "./appearance-parse";

/** 文案默认值。 */
const DEFAULT_LABELS = {
  appTitle: "相册",
  allAlbumsLabel: "全部",
  emptyAlbumHint: "这里还没有照片",
} as const;

/**
 * 相册内页作者设置键（无前缀）。
 *
 * @remarks
 * 供 `PhoneAlbumExtension.onRegister` 集中 `ctx.settings.subscribe`。
 */
export const ALBUM_SETTINGS_KEYS = [
  "appTitle",
  "allAlbumsLabel",
  "emptyAlbumHint",
  "defaultAlbums",
  "defaultMedia",
  ...ALBUM_APPEARANCE_SETTINGS_KEYS,
] as const;

/** 字符串字段规范化：非字符串 / 空白回落到 fallback，并截断到 max。 */
function nonEmpty(value: unknown, fallback: string, max = 40): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

/** 解析默认相册设置行：`id` / `name` 必填；`coverAsset` 空则省略。 */
function parseDefaultAlbum(row: unknown): DefaultAlbumSeed | null {
  if (!row || typeof row !== "object") return null;
  const raw = row as {
    id?: unknown;
    name?: unknown;
    coverAsset?: unknown;
    asset?: unknown;
  };
  const id = nonEmpty(raw.id, "");
  if (id === "") return null;
  const name = nonEmpty(raw.name, id);
  // 兼容旧字段名 asset
  const coverRaw =
    typeof raw.coverAsset === "string"
      ? raw.coverAsset
      : typeof raw.asset === "string"
        ? raw.asset
        : "";
  const coverAsset = coverRaw.trim();
  const seed: DefaultAlbumSeed = { id, name };
  if (coverAsset !== "") seed.coverAsset = coverAsset;
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
    posterAsset?: unknown;
  };
  const id = nonEmpty(raw.id, "");
  if (id === "") return null;
  const type = parseMediaType(raw.type) as MediaType | null;
  if (type === null) return null;
  const asset = coerceSettingsAsset(raw.asset);
  if (asset === "") return null;
  const albumIds = parseCommaIds(raw.albumIds);
  const seed: DefaultMediaSeed = { id, type, asset, albumIds };
  if (
    typeof raw.durationSec === "number" &&
    Number.isFinite(raw.durationSec) &&
    raw.durationSec > 0
  ) {
    seed.durationSec = raw.durationSec;
  }
  const poster = coerceSettingsAsset(raw.posterAsset);
  if (poster !== "") seed.posterAsset = poster;
  return seed;
}

/**
 * 设置里的 asset 字段可能是字符串，也可能是 `{ url }` / `{ uri }`。
 *
 * @param value - 原始设置值
 * @returns trim 后的 URI 字符串
 */
function coerceSettingsAsset(value: unknown): string {
  if (typeof value !== "string") {
    if (value && typeof value === "object") {
      const raw = value as { url?: unknown; uri?: unknown };
      if (typeof raw.url === "string" && raw.url.trim()) return raw.url.trim();
      if (typeof raw.uri === "string" && raw.uri.trim()) return raw.uri.trim();
    }
    return "";
  }
  return value.trim();
}

/**
 * 读取并规范化作者设置。
 *
 * @param ctx - 本模块扩展上下文
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

  const appearanceRaw: Record<string, unknown> = {};
  for (const key of ALBUM_APPEARANCE_SETTINGS_KEYS) {
    appearanceRaw[key] = ctx.settings.get(key);
  }

  return {
    ...parseAppearanceFromSettings(appearanceRaw),
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
  ...DEFAULT_ALBUM_APPEARANCE,
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
