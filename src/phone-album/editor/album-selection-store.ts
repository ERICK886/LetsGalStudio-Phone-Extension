/**
 * @file album-selection-store.ts
 * @description 相册编辑器列表选中态（useSyncExternalStore）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import { useCallback, useSyncExternalStore } from "react";

type SelectionSnapshot = {
  selectedAlbumUid: string;
  selectedMediaUid: string;
  /** 文案页左右栏分置，需共享当前内容项。 */
  selectedCopyId: string;
};

let selectedAlbumUid = "";
let selectedMediaUid = "";
let selectedCopyId = "appTitle";
const listeners = new Set<() => void>();

let cachedSnapshot: SelectionSnapshot = {
  selectedAlbumUid,
  selectedMediaUid,
  selectedCopyId,
};

/**
 * 通知订阅者。
 */
function emit(): void {
  cachedSnapshot = { selectedAlbumUid, selectedMediaUid, selectedCopyId };
  for (const listener of listeners) {
    listener();
  }
}

/**
 * 订阅选中态变更。
 *
 * @param listener - 回调
 * @returns 取消订阅
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 读取当前选中快照。
 *
 * @returns 选中 uid
 */
function getSnapshot(): SelectionSnapshot {
  return cachedSnapshot;
}

/**
 * 相册 / 媒体列表选中 hook。
 *
 * @returns 选中 uid 与 setter
 */
export function useAlbumEditorSelection(): SelectionSnapshot & {
  setSelectedAlbumUid: (uid: string) => void;
  setSelectedMediaUid: (uid: string) => void;
  setSelectedCopyId: (id: string) => void;
} {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setSelectedAlbumUid = useCallback((uid: string) => {
    if (uid !== selectedAlbumUid) {
      selectedAlbumUid = uid;
      emit();
    }
  }, []);

  const setSelectedMediaUid = useCallback((uid: string) => {
    if (uid !== selectedMediaUid) {
      selectedMediaUid = uid;
      emit();
    }
  }, []);

  const setSelectedCopyId = useCallback((id: string) => {
    if (id !== selectedCopyId) {
      selectedCopyId = id;
      emit();
    }
  }, []);

  return {
    selectedAlbumUid: snap.selectedAlbumUid,
    selectedMediaUid: snap.selectedMediaUid,
    selectedCopyId: snap.selectedCopyId,
    setSelectedAlbumUid,
    setSelectedMediaUid,
    setSelectedCopyId,
  };
}
