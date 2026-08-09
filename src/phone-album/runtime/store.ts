/**
 * @file store.ts
 * @description 绑定扩展 save，供方法与内页 UI 读写相册会话状态。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * `AlbumSaveMap` 与 `AlbumSaveState` 同形（六个 list 字段），读写时整体替换数组，
 * 禁止原地 push。写入后调用 `emitAlbumBus()` 通知内页刷新。
 */

import type { SaveAPI } from "@avg-studio/sdk";

import type {
  AlbumMedia,
  AlbumMediaLink,
  AlbumMeta,
  AlbumSaveState,
} from "../types.js";
import { emitAlbumBus, subscribeAlbumBus } from "./bus.js";

/**
 * 与 `defineSave` 对齐的存档字段映射。
 *
 * @property albumsExtra - 动态新增的相册 id
 * @property albumsRemoved - 被隐藏的默认相册 id
 * @property albumsMeta - 相册元数据覆盖（名称 / 封面）
 * @property media - 动态媒体条目
 * @property albumMedia - 多对多归属边
 * @property mediaRemoved - 被删除的媒体 id
 */
export type AlbumSaveMap = {
  albumsExtra: string[];
  albumsRemoved: string[];
  albumsMeta: AlbumMeta[];
  media: AlbumMedia[];
  albumMedia: AlbumMediaLink[];
  mediaRemoved: string[];
};

type AlbumSaveApi = SaveAPI<AlbumSaveMap>;

let saveApi: AlbumSaveApi | null = null;

/** save 未绑定时的内存兜底（方法执行后会升级为真实 save）。 */
let memoryState: AlbumSaveState = {
  albumsExtra: [],
  albumsRemoved: [],
  albumsMeta: [],
  media: [],
  albumMedia: [],
  mediaRemoved: [],
};

/**
 * 绑定 save（兼容 method `this.save` 的条件类型推导）。
 *
 * 绑定策略与 chat 对齐：
 * - 存档为空且内存有写（dirty）→ 用内存覆盖存档，避免 UI 先写后丢；
 * - 否则用存档覆盖内存。
 *
 * @param api - this.save 或兼容适配器
 *
 * @example
 * ```ts
 * bindAlbumSave(this.save);
 * ```
 */
export function bindAlbumSave(api: AlbumSaveApi | SaveAPI<Record<string, unknown>>): void {
  saveApi = api as AlbumSaveApi;
  const fromSave = readFromApi(saveApi);
  const saveEmpty = isStateEmpty(fromSave);
  const memoryDirty = !isStateEmpty(memoryState);

  if (saveEmpty && memoryDirty) {
    writeToApi(saveApi, memoryState);
  } else {
    memoryState = fromSave;
  }
}

/**
 * @returns 是否已绑定 save
 */
export function hasAlbumSave(): boolean {
  return saveApi !== null;
}

/**
 * 读取完整存档快照（只读拷贝）。
 *
 * @returns AlbumSaveState
 */
export function getAlbumSaveState(): AlbumSaveState {
  if (!saveApi) {
    return cloneState(memoryState);
  }
  const next = readFromApi(saveApi);
  memoryState = next;
  return cloneState(next);
}

/**
 * 整体替换存档状态并广播总线。
 *
 * @param next - 新的完整状态（list 字段整体替换，禁止原地 push）
 * @returns 写入后的只读拷贝
 */
export function setAlbumSaveState(next: AlbumSaveState): AlbumSaveState {
  const normalized: AlbumSaveState = {
    albumsExtra: [...next.albumsExtra],
    albumsRemoved: [...next.albumsRemoved],
    albumsMeta: next.albumsMeta.map((m) => ({ ...m })),
    media: next.media.map((m) => ({ ...m })),
    albumMedia: next.albumMedia.map((l) => ({ ...l })),
    mediaRemoved: [...next.mediaRemoved],
  };

  memoryState = normalized;
  if (saveApi) {
    writeToApi(saveApi, normalized);
  }
  emitAlbumBus();
  return cloneState(normalized);
}

/**
 * 订阅相册存档变更（内页 UI 用）。
 *
 * @param listener - 无参回调，被 `emitAlbumBus()` 调用
 * @returns 取消订阅函数
 */
export function subscribeAlbumStore(listener: () => void): () => void {
  return subscribeAlbumBus(listener);
}

/** 判断状态是否为空（六个 list 字段全空）。 */
function isStateEmpty(state: AlbumSaveState): boolean {
  return (
    state.albumsExtra.length === 0 &&
    state.albumsRemoved.length === 0 &&
    state.albumsMeta.length === 0 &&
    state.media.length === 0 &&
    state.albumMedia.length === 0 &&
    state.mediaRemoved.length === 0
  );
}

/** 从 save api 读取并折叠为 AlbumSaveState（数组层重新分配）。 */
function readFromApi(api: AlbumSaveApi): AlbumSaveState {
  return {
    albumsExtra: [...(api.get("albumsExtra") ?? [])],
    albumsRemoved: [...(api.get("albumsRemoved") ?? [])],
    albumsMeta: [...(api.get("albumsMeta") ?? [])].map((m) => ({ ...m })),
    media: [...(api.get("media") ?? [])].map((m) => ({ ...m })),
    albumMedia: [...(api.get("albumMedia") ?? [])].map((l) => ({ ...l })),
    mediaRemoved: [...(api.get("mediaRemoved") ?? [])],
  };
}

/** 整体写回 save api（list 字段整体 set，禁止原地 push）。 */
function writeToApi(api: AlbumSaveApi, state: AlbumSaveState): void {
  api.set("albumsExtra", [...state.albumsExtra]);
  api.set("albumsRemoved", [...state.albumsRemoved]);
  api.set(
    "albumsMeta",
    state.albumsMeta.map((m) => ({ ...m })),
  );
  api.set(
    "media",
    state.media.map((m) => ({ ...m })),
  );
  api.set(
    "albumMedia",
    state.albumMedia.map((l) => ({ ...l })),
  );
  api.set("mediaRemoved", [...state.mediaRemoved]);
}

/** 浅拷贝存档（数组层重新分配，元素引用保持）。 */
function cloneState(state: AlbumSaveState): AlbumSaveState {
  return {
    albumsExtra: [...state.albumsExtra],
    albumsRemoved: [...state.albumsRemoved],
    albumsMeta: state.albumsMeta.map((m) => ({ ...m })),
    media: state.media.map((m) => ({ ...m })),
    albumMedia: state.albumMedia.map((l) => ({ ...l })),
    mediaRemoved: [...state.mediaRemoved],
  };
}
