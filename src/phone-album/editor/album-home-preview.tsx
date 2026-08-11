/**
 * @file album-home-preview.tsx
 * @description 相册编辑器中栏预览：复用真实 AlbumApp 首页 / 网格 UI（pa-* 组件与样式）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 *
 * @remarks
 * - 注入 `ensureAlbumStyles` / Font Awesome，直接渲染 `HomeScreen`、`GridScreen`、`TabBar`。
 * - 目录由当前编辑器 defaultAlbums / defaultMedia（含有素材的草稿）经 `buildAlbumCatalog` 生成；
 *   存档用空快照，不混入相机胶卷。
 * - 支持首页 ↔ 网格内切换；`pageId === "album-media"` 时默认打开「全部」网格。
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";
import {
  readPhoneAppearanceValues,
  useTheme,
} from "@ink-zenly/phone-sdk";

import { ALL_ALBUM_ID, CAMERA_ALBUM_ID } from "../constants";
import { buildAlbumCatalog } from "../domain/index";
import { parseAppearanceFromSettings } from "../runtime/appearance-parse";
import type { AlbumMainTab } from "../runtime/camera-session";
import type { AlbumAuthorSettings, AlbumSaveState } from "../types";
import { PageTransition } from "../ui/components/PageTransition";
import { TabBar } from "../ui/components/TabBar";
import { CameraScreen } from "../ui/screens/CameraScreen";
import { GridScreen } from "../ui/screens/GridScreen";
import { HomeScreen } from "../ui/screens/HomeScreen";
import { ensureFontAwesome } from "../ui/styles/font-awesome";
import { ensureAlbumStyles } from "../ui/styles/inject-styles";
import {
  buildAlbumSkinCssVars,
  buildAlbumSkinDataAttrs,
  ensureAuthorCss,
} from "../ui/styles/album-skin";
import { mergePendingDefaultMedia } from "./album-editor-drafts";
import { readEditableDefaultAlbums } from "./albums-bridge";
import { readEditableDefaultMedia } from "./media-bridge";

/** 预览导航：仅首页与网格（查看器留作后续）。 */
type PreviewNav =
  | { screen: "home" }
  | { screen: "grid"; albumId: string };

/** 相册首页 / 网格预览的输入。 */
export interface AlbumHomePreviewProps {
  /** 当前相册分区的标量设置快照。 */
  values: Record<string, string>;
  /** settings 写入后的刷新令牌。 */
  revision: number;
  /**
   * 当前编辑器页 id。
   * `album-media` 时默认进入「全部」网格，其余页默认首页。
   */
  pageId?: string;
}

/**
 * 编辑器预览用的空存档（不含相机胶卷与运行时变更）。
 *
 * @returns 空 AlbumSaveState
 */
function emptyPreviewSave(): AlbumSaveState {
  return {
    albumsExtra: [],
    albumsRemoved: [],
    albumsMeta: [],
    media: [],
    albumMedia: [],
    mediaRemoved: [],
  };
}

/**
 * 从编辑器当前值构造作者设置快照。
 *
 * @param values - 文案标量
 * @param albums - 可编辑相册行
 * @param media - 可编辑媒体行（可含草稿，空 asset 的不进入目录）
 * @returns AlbumAuthorSettings
 */
function buildPreviewAuthorSettings(
  values: Record<string, string>,
  albums: ReturnType<typeof readEditableDefaultAlbums>,
  media: ReturnType<typeof readEditableDefaultMedia>,
): AlbumAuthorSettings {
  return {
    ...parseAppearanceFromSettings(values),
    appTitle: (values.appTitle ?? "").trim() || "相册",
    allAlbumsLabel: (values.allAlbumsLabel ?? "").trim() || "全部",
    emptyAlbumHint: (values.emptyAlbumHint ?? "").trim() || "这里还没有照片",
    defaultAlbums: albums.map((album) => {
      const cover = album.coverAsset.trim();
      return {
        id: album.id,
        name: album.name.trim() || album.id,
        ...(cover ? { coverAsset: cover } : {}),
      };
    }),
    defaultMedia: media
      .filter((item) => item.asset.trim() !== "")
      .map((item) => {
        const poster = item.posterAsset.trim();
        return {
          id: item.id,
          type: item.type,
          asset: item.asset.trim(),
          albumIds: [...item.albumIds],
          ...(item.durationSec > 0 ? { durationSec: item.durationSec } : {}),
          ...(poster ? { posterAsset: poster } : {}),
        };
      }),
  };
}

/**
 * 编辑器中栏：真机壳 + 与运行时一致的相册内页 UI。
 *
 * @param props - 文案、刷新令牌、当前编辑页
 * @returns 预览节点
 *
 * @example
 * ```tsx
 * <AlbumHomePreview values={values} revision={3} pageId="album-catalog" />
 * ```
 */
export function AlbumHomePreview({
  values,
  revision,
  pageId = "album-copy",
}: AlbumHomePreviewProps): React.ReactElement {
  ensureAlbumStyles();
  ensureFontAwesome();

  const ctx = useExtensionContext();
  const { tokens } = useTheme();

  const phoneValues = useMemo(() => {
    void revision;
    return readPhoneAppearanceValues(ctx);
  }, [ctx, revision]);

  const settings = useMemo(() => {
    void revision;
    const albums = readEditableDefaultAlbums(ctx);
    const media = mergePendingDefaultMedia(readEditableDefaultMedia(ctx));
    return buildPreviewAuthorSettings(values, albums, media);
  }, [ctx, revision, values]);

  const previewRootStyle = useMemo(() => {
    const skin = buildAlbumSkinCssVars(settings);
    return {
      flex: "1 1 auto",
      minHeight: 0,
      height: "auto",
      ["--phone-safe-top" as string]: "0px",
      ["--phone-safe-bottom" as string]: "0px",
      ["--phone-safe-left" as string]: "0px",
      ["--phone-safe-right" as string]: "0px",
      ...skin,
    } as React.CSSProperties;
  }, [settings]);

  const previewRootAttrs = useMemo(
    () => buildAlbumSkinDataAttrs(settings),
    [settings],
  );

  useEffect(() => {
    ensureAuthorCss(settings.styleCustomCss);
  }, [settings.styleCustomCss]);

  const catalog = useMemo(
    () => buildAlbumCatalog(settings, emptyPreviewSave()),
    [settings],
  );

  const [tab, setTab] = useState<AlbumMainTab>("album");
  const [nav, setNav] = useState<PreviewNav>({ screen: "home" });
  const [transitionDirection, setTransitionDirection] = useState<
    "forward" | "back" | "crossfade"
  >("forward");

  /** 切换编辑器页时同步预览默认层（仍可在壳内点进网格）。 */
  useEffect(() => {
    if (pageId === "album-media") {
      setTab("album");
      setNav({ screen: "grid", albumId: ALL_ALBUM_ID });
      setTransitionDirection("forward");
      return;
    }
    setTab("album");
    setNav({ screen: "home" });
    setTransitionDirection("back");
  }, [pageId]);

  const openGrid = useCallback((albumId: string) => {
    setTab("album");
    setNav({ screen: "grid", albumId });
    setTransitionDirection("forward");
  }, []);

  const goBack = useCallback(() => {
    setNav((prev) => {
      if (prev.screen === "grid") {
        setTransitionDirection("back");
        return { screen: "home" };
      }
      return prev;
    });
  }, []);

  /** 预览内不进查看器，仅保留网格点击无破坏（可后续扩展）。 */
  const openViewer = useCallback((_albumId: string, _mediaId: string) => {
    /* 编辑器预览暂不进大图层，避免依赖存档删除等运行时副作用 */
  }, []);

  const onOpenCameraRoll = useCallback(() => {
    setTab("album");
    setNav({ screen: "grid", albumId: CAMERA_ALBUM_ID });
    setTransitionDirection("forward");
  }, []);

  const pageKey =
    nav.screen === "home" ? "home" : `grid:${nav.albumId}`;

  const albumPage =
    nav.screen === "home" ? (
      <HomeScreen
        settings={settings}
        catalog={catalog}
        onCloseApp={() => {
          /* 预览无 closeApp */
        }}
        onOpenGrid={openGrid}
      />
    ) : (
      <GridScreen
        albumId={nav.albumId}
        settings={settings}
        catalog={catalog}
        onBack={goBack}
        onOpenViewer={openViewer}
      />
    );

  const phoneTitle = phoneValues.phoneTitle?.trim() || "手机";
  const appTitle = settings.appTitle;
  const shellColor = phoneValues.shellColor || "#11151f";
  const isAndroid = phoneValues.phoneStylePreset === "android";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        display: "grid",
        placeItems: "center",
        overflow: "auto",
        padding: 16,
        boxSizing: "border-box",
        background: tokens.bgSunken,
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
      }}
    >
      <section
        aria-label={`${phoneTitle} · ${appTitle}预览`}
        style={{
          width: 300,
          height: 600,
          flex: "0 0 auto",
          overflow: "hidden",
          border: `9px solid ${shellColor}`,
          borderRadius: isAndroid ? 26 : 42,
          boxSizing: "border-box",
          background: shellColor,
          boxShadow: "0 16px 40px rgba(0, 0, 0, .38)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            background: "#0f1419",
            color: "#fff",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              flex: "0 0 auto",
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 16px 4px",
              fontSize: 11,
              fontWeight: 600,
              background: "#0f1419",
            }}
          >
            <time>9:41</time>
            <span aria-hidden="true">● ● ●</span>
          </header>

          <div
            className="pa-root"
            style={previewRootStyle}
            {...previewRootAttrs}
          >
            <div className="pa-main">
              {tab === "album" ? (
                <PageTransition pageKey={pageKey} direction={transitionDirection}>
                  {albumPage}
                </PageTransition>
              ) : (
                <CameraScreen
                  closePhone={() => {
                    /* 预览不关手机 */
                  }}
                  onOpenCameraRoll={onOpenCameraRoll}
                />
              )}
            </div>
            <TabBar active={tab} onChange={setTab} />
          </div>
        </div>
      </section>
    </div>
  );
}

export default AlbumHomePreview;
