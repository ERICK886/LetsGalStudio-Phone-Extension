/**
 * @file useAlbumSession.ts
 * @description 订阅 album bus / store，提供相册目录快照与导航。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * - 挂载时若 save 未 bind，仍可用空存档 + 缓存设置渲染默认种子。
 * - 每次 bus emit 用 `buildAlbumCatalog(getCachedAuthorSettings(), getAlbumSaveState())`
 *   重新计算 `{ settings, catalog }`。
 * - 导航状态由本 hook 管理：home → grid → viewer；返回路径 viewer→grid→home→closeApp。
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { ALL_ALBUM_ID } from "../../constants";
import { buildAlbumCatalog, type AlbumCatalog } from "../../domain/index";
import type { AlbumAuthorSettings } from "../../types";
import {
  getCachedAuthorSettings,
  getAlbumSaveState,
  subscribeAlbumStore,
} from "../../runtime/index";

/** 三层屏幕导航状态。 */
export type AlbumNav =
  | { screen: "home" }
  | { screen: "grid"; albumId: string }
  | { screen: "viewer"; albumId: string; mediaId: string };

/** useAlbumSession 返回结构。 */
export interface AlbumSession {
  /** 作者设置快照（每次刷新都重新拷贝） */
  settings: AlbumAuthorSettings;
  /** 相册目录（albums / mediaByAlbum / allMedia） */
  catalog: AlbumCatalog;
  /** 当前导航状态 */
  nav: AlbumNav;
  /** 进入某相册网格 */
  openGrid: (albumId: string) => void;
  /** 进入查看器 */
  openViewer: (albumId: string, mediaId: string) => void;
  /** 返回上一层：viewer→grid→home→onExitHome */
  goBack: () => void;
  /** 重新读取快照（手动刷新） */
  refresh: () => void;
}

/**
 * 订阅 bus 并管理导航；返回会话快照与导航回调。
 *
 * @param onExitHome - 在 home 层再次返回时调用（通常为 `closeApp`）
 * @returns AlbumSession
 *
 * @example
 * ```tsx
 * const session = useAlbumSession(props.closeApp);
 * ```
 */
export function useAlbumSession(onExitHome: () => void): AlbumSession {
  const [tick, setTick] = useState(0);
  const [nav, setNav] = useState<AlbumNav>({ screen: "home" });

  const refresh = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    return subscribeAlbumStore(() => {
      refresh();
    });
  }, [refresh]);

  const snapshot = useMemo(() => {
    const settings = getCachedAuthorSettings();
    const save = getAlbumSaveState();
    const catalog = buildAlbumCatalog(settings, save);
    return { settings, catalog };
    // tick 触发重算；nav 变化时也重算（grid 列表可能依赖 albumId）
    // 实际 catalog 与 nav 无关，但保持简洁依赖即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const openGrid = useCallback((albumId: string) => {
    setNav({ screen: "grid", albumId });
  }, []);

  const openViewer = useCallback((albumId: string, mediaId: string) => {
    setNav({ screen: "viewer", albumId, mediaId });
  }, []);

  const goBack = useCallback(() => {
    setNav((prev) => {
      if (prev.screen === "viewer") {
        return { screen: "grid", albumId: prev.albumId };
      }
      if (prev.screen === "grid") {
        return { screen: "home" };
      }
      // home：交由调用方决定（通常 closeApp）
      onExitHome();
      return prev;
    });
  }, [onExitHome]);

  return {
    settings: snapshot.settings,
    catalog: snapshot.catalog,
    nav,
    openGrid,
    openViewer,
    goBack,
    refresh,
  };
}

/**
 * 取某相册的媒体列表（含虚拟「全部」）。
 *
 * @param catalog - 相册目录
 * @param albumId - 相册 id；`ALL_ALBUM_ID` 返回 `allMedia`
 * @returns 媒体视图数组
 */
export function listMediaForAlbum(
  catalog: AlbumCatalog,
  albumId: string,
): import("../../types").MediaView[] {
  if (albumId === ALL_ALBUM_ID) return catalog.allMedia;
  return catalog.mediaByAlbum.get(albumId) ?? [];
}
