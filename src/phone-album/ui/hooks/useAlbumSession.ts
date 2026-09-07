/**
 * @file useAlbumSession.ts
 * @description 订阅 album bus / store，提供相册目录快照与导航。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.2.0
 *
 * @remarks
 * - 挂载时若 save 未 bind，仍可用空存档 + 缓存设置渲染默认种子。
 * - 每次 bus emit 用 `buildAlbumCatalog(getCachedAuthorSettings(), getAlbumSaveState())`
 *   重新计算 `{ settings, catalog }`。
 * - 导航状态由本 hook 管理：home → grid → viewer；返回路径 viewer→grid→home→closeApp。
 * - `transitionDirection` 与 `nav` 同状态更新，供 PageTransition 同步使用。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import { ALL_ALBUM_ID } from "../../constants";
import { buildAlbumCatalog, type AlbumCatalog } from "../../domain/index";
import type { AlbumAuthorSettings } from "../../types";
import {
  getCachedAuthorSettings,
  getAlbumSaveState,
  getAlbumRuntimeKey,
  subscribeAlbumStore,
} from "../../runtime/index";
import type { PageTransitionDirection } from "../components/PageTransition";

/** 三层屏幕导航状态。 */
export type AlbumNav =
  | { screen: "home" }
  | { screen: "grid"; albumId: string }
  | { screen: "viewer"; albumId: string; mediaId: string };

interface NavBundle {
  nav: AlbumNav;
  transitionDirection: PageTransitionDirection;
}

/** useAlbumSession 返回结构。 */
export interface AlbumSession {
  /** 作者设置快照（每次刷新都重新拷贝） */
  settings: AlbumAuthorSettings;
  /** 相册目录（albums / mediaByAlbum / allMedia） */
  catalog: AlbumCatalog;
  /** 当前导航状态 */
  nav: AlbumNav;
  /** 最近一次导航的过渡方向 */
  transitionDirection: PageTransitionDirection;
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
  const ctx = useExtensionContext();
  const runtimeKey = getAlbumRuntimeKey(ctx);
  const [tick, setTick] = useState(0);
  const [bundle, setBundle] = useState<NavBundle>({
    nav: { screen: "home" },
    transitionDirection: "forward",
  });

  const refresh = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    return subscribeAlbumStore(runtimeKey, () => {
      refresh();
    });
  }, [refresh, runtimeKey]);

  const snapshot = useMemo(() => {
    const settings = getCachedAuthorSettings(runtimeKey);
    const save = getAlbumSaveState(runtimeKey);
    const catalog = buildAlbumCatalog(settings, save);
    return { settings, catalog };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeKey, tick]);

  const openGrid = useCallback((albumId: string) => {
    setBundle({
      nav: { screen: "grid", albumId },
      transitionDirection: "forward",
    });
  }, []);

  const openViewer = useCallback((albumId: string, mediaId: string) => {
    setBundle((prev) => ({
      nav: { screen: "viewer", albumId, mediaId },
      transitionDirection:
        prev.nav.screen === "viewer" ? "crossfade" : "forward",
    }));
  }, []);

  const goBack = useCallback(() => {
    setBundle((prev) => {
      if (prev.nav.screen === "viewer") {
        return {
          nav: { screen: "grid", albumId: prev.nav.albumId },
          transitionDirection: "back",
        };
      }
      if (prev.nav.screen === "grid") {
        return {
          nav: { screen: "home" },
          transitionDirection: "back",
        };
      }
      onExitHome();
      return prev;
    });
  }, [onExitHome]);

  return {
    settings: snapshot.settings,
    catalog: snapshot.catalog,
    nav: bundle.nav,
    transitionDirection: bundle.transitionDirection,
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
