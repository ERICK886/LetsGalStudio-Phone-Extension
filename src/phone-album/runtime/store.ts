/**
 * @file store.ts
 * @description 绑定扩展 save，供方法与内页 UI 读写相册会话状态。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * - 剧情相册字段：`persistence: "slot"`（跟游戏存档槽）
 * - 相机胶卷：`persistence: "shared"`（跨存档、关游戏也保留；需 flushShared）
 * - 内页若在 save 绑定前写入，只会进内存；`autonomous` + onInit 应尽早 bind。
 * - 自 v0.3.0 起，存档键带 `album` 前缀（`albumAlbumsExtra` 等），由 `ALBUM_SAVE_KEY_MAP`
 *   通过键映射适配器把逻辑名（`albumsExtra` 等）翻译为实际存档键。领域层
 *   （`actions.ts` / UI）继续使用逻辑名，无感知。
 */

import type { SaveAPI } from "@avg-studio/sdk";

import { ALBUM_SAVE_KEY_MAP } from "../save-fields";
import { CAMERA_ALBUM_ID, CAMERA_ALBUM_NAME } from "../constants";
import type {
  AlbumMedia,
  AlbumMediaLink,
  AlbumMeta,
  AlbumSaveState,
} from "../types";
import { emitAlbumBus, subscribeAlbumBus } from "./bus";

/**
 * 与 `defineSave` 对齐的存档字段映射。
 */
export type AlbumSaveMap = {
  albumsExtra: string[];
  albumsRemoved: string[];
  albumsMeta: AlbumMeta[];
  media: AlbumMedia[];
  albumMedia: AlbumMediaLink[];
  mediaRemoved: string[];
  /** 相机胶卷媒体（shared） */
  cameraMedia: AlbumMedia[];
  /** 相机胶卷归属边（shared） */
  cameraAlbumMedia: AlbumMediaLink[];
  /** 相机侧相册元数据（shared，含相机胶卷） */
  cameraAlbumsMeta: AlbumMeta[];
};

/** 相机 shared 三字段。 */
export interface CameraSharedState {
  cameraMedia: AlbumMedia[];
  cameraAlbumMedia: AlbumMediaLink[];
  cameraAlbumsMeta: AlbumMeta[];
}

/**
 * 键映射适配器：把对逻辑名的 `get/set` 翻译为对 `album*` 前缀键的访问。
 *
 * @remarks
 * - 仅翻译 `AlbumSaveMap` 已知的九个逻辑键；其他键直接透传到底层 api（防御性）。
 * - `useValue` 同样按规则映射，保持接口完整。
 */
function createKeyMappedApi(
  api: SaveAPI<Record<string, unknown>>,
): SaveAPI<AlbumSaveMap> {
  const toSaveKey = (logical: string): string =>
    (ALBUM_SAVE_KEY_MAP as Record<string, string>)[logical] ?? logical;

  return {
    get: <K extends keyof AlbumSaveMap>(key: K): AlbumSaveMap[K] =>
      api.get(toSaveKey(key as string)) as AlbumSaveMap[K],
    set: <K extends keyof AlbumSaveMap>(
      key: K,
      value: AlbumSaveMap[K],
    ): void => {
      api.set(toSaveKey(key as string), value as unknown);
    },
    useValue: <K extends keyof AlbumSaveMap>(
      key: K,
    ): [AlbumSaveMap[K], (v: AlbumSaveMap[K]) => void] => {
      const [value, setter] = api.useValue(toSaveKey(key as string)) as [
        unknown,
        (v: unknown) => void,
      ];
      return [
        value as AlbumSaveMap[K],
        (v: AlbumSaveMap[K]) => setter(v as unknown),
      ];
    },
  };
}

type AlbumSaveApi = SaveAPI<AlbumSaveMap>;

let saveApi: AlbumSaveApi | null = null;

/** save 未绑定时的内存兜底（slot 部分）。 */
let memorySlot: AlbumSaveState = {
  albumsExtra: [],
  albumsRemoved: [],
  albumsMeta: [],
  media: [],
  albumMedia: [],
  mediaRemoved: [],
};

/** save 未绑定时的内存兜底（相机 shared）。 */
let memoryCamera: CameraSharedState = {
  cameraMedia: [],
  cameraAlbumMedia: [],
  cameraAlbumsMeta: [],
};

/**
 * 绑定 save（兼容 method `this.save` 的条件类型推导）。
 *
 * @param api - this.save 或兼容适配器；键名可为 `album*` 前缀（由适配器翻译）
 * @returns void
 *
 * @example
 * ```ts
 * bindAlbumSave(this.save);
 * ```
 *
 * @remarks
 * 入参 `api` 通常是宿主包装类实例的 `this.save`，其键为 `album*` 前缀；
 * 本函数包一层键映射适配器，使本模块其余代码继续使用逻辑名。
 */
export function bindAlbumSave(
  api: AlbumSaveApi | SaveAPI<Record<string, unknown>>,
): void {
  const mapped = createKeyMappedApi(
    api as SaveAPI<Record<string, unknown>>,
  ) as AlbumSaveApi;
  saveApi = mapped;
  const fromSlot = readSlotFromApi(mapped);
  const fromCamera = readCameraFromApi(mapped);
  const slotEmpty = isSlotEmpty(fromSlot);
  const cameraEmpty = isCameraEmpty(fromCamera);
  const memorySlotDirty = !isSlotEmpty(memorySlot);
  const memoryCameraDirty = !isCameraEmpty(memoryCamera);

  if (slotEmpty && memorySlotDirty) {
    writeSlotToApi(mapped, memorySlot);
  } else {
    memorySlot = fromSlot;
  }

  if (cameraEmpty && memoryCameraDirty) {
    writeCameraToApi(mapped, memoryCamera);
  } else {
    memoryCamera = fromCamera;
  }

  console.info("[phone-album] save 已绑定", {
    slotMedia: memorySlot.media.length,
    cameraMedia: memoryCamera.cameraMedia.length,
  });
}

/** @returns 是否已绑定 save */
export function hasAlbumSave(): boolean {
  return saveApi !== null;
}

/**
 * 读取合并后的完整状态（slot ∪ 相机 shared），供 UI / 剧情突变使用。
 *
 * @returns AlbumSaveState
 */
export function getAlbumSaveState(): AlbumSaveState {
  const slot = saveApi ? readSlotFromApi(saveApi) : cloneSlot(memorySlot);
  const camera = saveApi
    ? readCameraFromApi(saveApi)
    : cloneCamera(memoryCamera);
  memorySlot = slot;
  memoryCamera = camera;
  return mergeSlotAndCamera(slot, camera);
}

/**
 * 写入剧情侧 slot 状态（会保留相机 shared，不会用合并结果覆盖相机库）。
 *
 * @param next - 通常为突变后的合并视图；相机器材按 id 拆回 shared
 * @returns 写入后的合并视图拷贝
 */
export function setAlbumSaveState(next: AlbumSaveState): AlbumSaveState {
  const cameraIds = new Set(
    (saveApi
      ? readCameraFromApi(saveApi).cameraMedia
      : memoryCamera.cameraMedia
    ).map((m) => m.id),
  );

  const slotPart: AlbumSaveState = {
    albumsExtra: next.albumsExtra.filter((id) => id !== CAMERA_ALBUM_ID),
    albumsRemoved: [...next.albumsRemoved],
    albumsMeta: next.albumsMeta
      .filter((m) => m.id !== CAMERA_ALBUM_ID)
      .map((m) => ({ ...m })),
    media: next.media.filter((m) => !cameraIds.has(m.id)).map((m) => ({ ...m })),
    albumMedia: next.albumMedia
      .filter((l) => !cameraIds.has(l.mediaId))
      .map((l) => ({ ...l })),
    mediaRemoved: [...next.mediaRemoved],
  };

  // 相机库：保留仍存在于 next 中的旧相机媒体；被剧情删掉的则从 shared 移除
  const prevCamera = saveApi
    ? readCameraFromApi(saveApi)
    : cloneCamera(memoryCamera);
  const nextCameraMedia = next.media
    .filter((m) => cameraIds.has(m.id))
    .map((m) => ({ ...m }));
  const nextCameraIds = new Set(nextCameraMedia.map((m) => m.id));
  const nextCameraLinks = next.albumMedia
    .filter((l) => nextCameraIds.has(l.mediaId))
    .map((l) => ({ ...l }));
  const nextCameraMeta =
    nextCameraMedia.length > 0
      ? upsertCameraRollMeta(
          prevCamera.cameraAlbumsMeta,
          next.albumsMeta.find((m) => m.id === CAMERA_ALBUM_ID),
        )
      : prevCamera.cameraAlbumsMeta.filter((m) => m.id !== CAMERA_ALBUM_ID);

  const cameraPart: CameraSharedState = {
    cameraMedia: nextCameraMedia,
    cameraAlbumMedia: nextCameraLinks,
    cameraAlbumsMeta: nextCameraMeta,
  };

  memorySlot = slotPart;
  memoryCamera = cameraPart;

  if (saveApi) {
    writeSlotToApi(saveApi, slotPart);
    writeCameraToApi(saveApi, cameraPart);
  } else {
    console.warn(
      "[phone-album] save 未绑定：写入仅存在内存，关游戏 / 读档会丢失",
    );
  }

  emitAlbumBus();
  return mergeSlotAndCamera(slotPart, cameraPart);
}

/**
 * 将一张照片写入相机胶卷（shared），不依赖玩家手动存档槽。
 *
 * @param media - 媒体条目
 * @returns 是否已写入真实 save（false = 仅内存）
 */
export function addCameraPhotoToShared(media: AlbumMedia): boolean {
  const camera = saveApi
    ? readCameraFromApi(saveApi)
    : cloneCamera(memoryCamera);

  const without = camera.cameraMedia.filter((m) => m.id !== media.id);
  const nextMedia = [...without, { ...media }];
  const links = camera.cameraAlbumMedia.filter((l) => l.mediaId !== media.id);
  links.push({ albumId: CAMERA_ALBUM_ID, mediaId: media.id });

  const next: CameraSharedState = {
    cameraMedia: nextMedia,
    cameraAlbumMedia: links,
    cameraAlbumsMeta: upsertCameraRollMeta(camera.cameraAlbumsMeta),
  };

  memoryCamera = next;
  if (saveApi) {
    writeCameraToApi(saveApi, next);
    emitAlbumBus();
    return true;
  }

  console.warn(
    "[phone-album] save 未绑定：拍照仅写入内存，请确认扩展 autonomous/onInit 已生效",
  );
  emitAlbumBus();
  return false;
}

/**
 * 判断媒体是否属于玩家拍照（相机胶卷 shared）。
 *
 * @param mediaId - 媒体 id
 */
export function isCameraMediaId(mediaId: string): boolean {
  const id = mediaId?.trim() ?? "";
  if (id === "") return false;
  const camera = saveApi
    ? readCameraFromApi(saveApi)
    : cloneCamera(memoryCamera);
  return camera.cameraMedia.some((m) => m.id === id);
}

/**
 * 从相机胶卷删除一张玩家拍照。
 *
 * @param mediaId - 媒体 id
 * @returns 是否删除成功（写入了 save 或至少更新了内存）
 */
export function removeCameraPhotoFromShared(mediaId: string): boolean {
  const id = mediaId?.trim() ?? "";
  if (id === "") {
    console.warn("[phone-album] removeCameraPhotoFromShared：空 mediaId");
    return false;
  }

  const camera = saveApi
    ? readCameraFromApi(saveApi)
    : cloneCamera(memoryCamera);

  if (!camera.cameraMedia.some((m) => m.id === id)) {
    console.warn("[phone-album] 非相机胶卷媒体，拒绝删除", id);
    return false;
  }

  const nextMedia = camera.cameraMedia.filter((m) => m.id !== id);
  const nextLinks = camera.cameraAlbumMedia.filter((l) => l.mediaId !== id);
  const next: CameraSharedState = {
    cameraMedia: nextMedia,
    cameraAlbumMedia: nextLinks,
    cameraAlbumsMeta:
      nextMedia.length > 0
        ? upsertCameraRollMeta(camera.cameraAlbumsMeta)
        : camera.cameraAlbumsMeta.filter((m) => m.id !== CAMERA_ALBUM_ID),
  };

  memoryCamera = next;
  if (saveApi) {
    writeCameraToApi(saveApi, next);
  } else {
    console.warn(
      "[phone-album] save 未绑定：删除仅作用于内存，关游戏后可能恢复",
    );
  }
  emitAlbumBus();
  return true;
}

/**
 * 订阅相册存档变更（内页 UI 用）。
 *
 * @param listener - 无参回调
 * @returns 取消订阅函数
 */
export function subscribeAlbumStore(listener: () => void): () => void {
  return subscribeAlbumBus(listener);
}

/** 合并 slot + 相机 shared 为 UI/突变用视图。 */
function mergeSlotAndCamera(
  slot: AlbumSaveState,
  camera: CameraSharedState,
): AlbumSaveState {
  const mediaById = new Map<string, AlbumMedia>();
  for (const m of slot.media) mediaById.set(m.id, { ...m });
  for (const m of camera.cameraMedia) mediaById.set(m.id, { ...m });

  const linkKey = new Set<string>();
  const albumMedia: AlbumMediaLink[] = [];
  for (const l of [...slot.albumMedia, ...camera.cameraAlbumMedia]) {
    const key = `${l.albumId}\0${l.mediaId}`;
    if (linkKey.has(key)) continue;
    linkKey.add(key);
    albumMedia.push({ ...l });
  }

  const albumsExtra = [...slot.albumsExtra];
  if (
    camera.cameraMedia.length > 0 &&
    !albumsExtra.includes(CAMERA_ALBUM_ID)
  ) {
    albumsExtra.push(CAMERA_ALBUM_ID);
  }

  const metaById = new Map<string, AlbumMeta>();
  for (const m of slot.albumsMeta) metaById.set(m.id, { ...m });
  for (const m of camera.cameraAlbumsMeta) metaById.set(m.id, { ...m });
  if (camera.cameraMedia.length > 0 && !metaById.has(CAMERA_ALBUM_ID)) {
    metaById.set(CAMERA_ALBUM_ID, {
      id: CAMERA_ALBUM_ID,
      name: CAMERA_ALBUM_NAME,
    });
  }

  return {
    albumsExtra,
    albumsRemoved: [...slot.albumsRemoved],
    albumsMeta: [...metaById.values()],
    media: [...mediaById.values()],
    albumMedia,
    mediaRemoved: [...slot.mediaRemoved],
  };
}

function upsertCameraRollMeta(
  metas: AlbumMeta[],
  override?: AlbumMeta,
): AlbumMeta[] {
  const name = override?.name?.trim() || CAMERA_ALBUM_NAME;
  const nextMeta: AlbumMeta = {
    id: CAMERA_ALBUM_ID,
    name,
    ...(override?.coverMediaId ? { coverMediaId: override.coverMediaId } : {}),
    ...(override?.coverAsset ? { coverAsset: override.coverAsset } : {}),
  };
  const others = metas.filter((m) => m.id !== CAMERA_ALBUM_ID);
  return [...others, nextMeta];
}

function isSlotEmpty(state: AlbumSaveState): boolean {
  return (
    state.albumsExtra.length === 0 &&
    state.albumsRemoved.length === 0 &&
    state.albumsMeta.length === 0 &&
    state.media.length === 0 &&
    state.albumMedia.length === 0 &&
    state.mediaRemoved.length === 0
  );
}

function isCameraEmpty(state: CameraSharedState): boolean {
  return (
    state.cameraMedia.length === 0 &&
    state.cameraAlbumMedia.length === 0 &&
    state.cameraAlbumsMeta.length === 0
  );
}

function readSlotFromApi(api: AlbumSaveApi): AlbumSaveState {
  return {
    albumsExtra: [...(api.get("albumsExtra") ?? [])],
    albumsRemoved: [...(api.get("albumsRemoved") ?? [])],
    albumsMeta: [...(api.get("albumsMeta") ?? [])].map((m) => ({ ...m })),
    media: [...(api.get("media") ?? [])].map((m) => ({ ...m })),
    albumMedia: [...(api.get("albumMedia") ?? [])].map((l) => ({ ...l })),
    mediaRemoved: [...(api.get("mediaRemoved") ?? [])],
  };
}

function readCameraFromApi(api: AlbumSaveApi): CameraSharedState {
  return {
    cameraMedia: [...(api.get("cameraMedia") ?? [])].map((m) => ({ ...m })),
    cameraAlbumMedia: [...(api.get("cameraAlbumMedia") ?? [])].map((l) => ({
      ...l,
    })),
    cameraAlbumsMeta: [...(api.get("cameraAlbumsMeta") ?? [])].map((m) => ({
      ...m,
    })),
  };
}

function writeSlotToApi(api: AlbumSaveApi, state: AlbumSaveState): void {
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

function writeCameraToApi(api: AlbumSaveApi, state: CameraSharedState): void {
  api.set(
    "cameraMedia",
    state.cameraMedia.map((m) => ({ ...m })),
  );
  api.set(
    "cameraAlbumMedia",
    state.cameraAlbumMedia.map((l) => ({ ...l })),
  );
  api.set(
    "cameraAlbumsMeta",
    state.cameraAlbumsMeta.map((m) => ({ ...m })),
  );
}

function cloneSlot(state: AlbumSaveState): AlbumSaveState {
  return {
    albumsExtra: [...state.albumsExtra],
    albumsRemoved: [...state.albumsRemoved],
    albumsMeta: state.albumsMeta.map((m) => ({ ...m })),
    media: state.media.map((m) => ({ ...m })),
    albumMedia: state.albumMedia.map((l) => ({ ...l })),
    mediaRemoved: [...state.mediaRemoved],
  };
}

function cloneCamera(state: CameraSharedState): CameraSharedState {
  return {
    cameraMedia: state.cameraMedia.map((m) => ({ ...m })),
    cameraAlbumMedia: state.cameraAlbumMedia.map((l) => ({ ...l })),
    cameraAlbumsMeta: state.cameraAlbumsMeta.map((m) => ({ ...m })),
  };
}
