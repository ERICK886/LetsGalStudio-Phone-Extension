/**
 * @file AlbumApp.tsx
 * @description Phone SDK 内页根：Tab（相册/拍照）、样式注入、导航与页面过渡。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.3.0
 *
 * @remarks
 * - 主 Tab：相册 | 拍照（底部 TabBar + Font Awesome）
 * - 相册导航：home → grid → viewer；返回 viewer→grid→home→closeApp()
 * - 拍照：关 UI → 截游戏画面 → 恢复 → Data URL 写入「相机胶卷」
 */

import type { PhoneAppRenderProps } from "@ink-zenly/phone-sdk/plugin";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { CAMERA_ALBUM_ID } from "../constants";
import {
  consumeResumeTab,
  type AlbumMainTab,
} from "../runtime/camera-session";
import { hasAlbumSave } from "../runtime/store";
import { PageTransition } from "./components/PageTransition";
import { TabBar } from "./components/TabBar";
import { useAlbumSession } from "./hooks/useAlbumSession";
import { useSafeAreaStyle } from "./hooks/useSafeAreaStyle";
import {
  CameraScreen,
  GridScreen,
  HomeScreen,
  ViewerScreen,
} from "./screens/index";
import { ensureFontAwesome } from "./styles/font-awesome";
import { ensureAlbumStyles } from "./styles/inject-styles";
import {
  buildAlbumSkinCssVars,
  buildAlbumSkinDataAttrs,
  ensureAuthorCss,
} from "./styles/album-skin";

/**
 * Phone SDK 内页根组件。
 *
 * @param props - PhoneAppRenderProps
 * @returns 嵌在手机屏幕内的 React 节点
 */
export function AlbumApp(props: PhoneAppRenderProps) {
  ensureAlbumStyles();
  ensureFontAwesome();

  const { closeApp, closePhone, safeAreaInsets } = props;
  const session = useAlbumSession(closeApp);
  const rootStyle = useSafeAreaStyle(safeAreaInsets, { includeBottom: false });

  const [tab, setTab] = useState<AlbumMainTab>(() => consumeResumeTab());

  useEffect(() => {
    if (!hasAlbumSave()) {
      console.warn(
        "[phone-album] 内页打开时 save 尚未绑定；若拍照后变量仍为空，请确认扩展已 autonomous 并重载",
      );
    }
  }, []);

  const {
    nav,
    transitionDirection,
    settings,
    catalog,
    openGrid,
    openViewer,
    goBack,
  } = session;

  const skinStyle = useMemo(
    () => buildAlbumSkinCssVars(settings),
    [settings],
  );
  const rootDataAttrs = useMemo(
    () => buildAlbumSkinDataAttrs(settings),
    [settings],
  );
  const mergedRootStyle = useMemo(
    () => ({ ...rootStyle, ...skinStyle }),
    [rootStyle, skinStyle],
  );

  useEffect(() => {
    ensureAuthorCss(settings.styleCustomCss);
  }, [settings.styleCustomCss]);

  const onTabChange = useCallback((next: AlbumMainTab) => {
    setTab(next);
  }, []);

  const onOpenCameraRoll = useCallback(() => {
    setTab("album");
    openGrid(CAMERA_ALBUM_ID);
  }, [openGrid]);

  const pageKey = useMemo(() => {
    if (nav.screen === "home") return "home";
    if (nav.screen === "grid") return `grid:${nav.albumId}`;
    return `viewer:${nav.albumId}:${nav.mediaId}`;
  }, [nav]);

  const albumPage = useMemo(() => {
    if (nav.screen === "home") {
      return (
        <HomeScreen
          settings={settings}
          catalog={catalog}
          onCloseApp={closeApp}
          onOpenGrid={openGrid}
        />
      );
    }
    if (nav.screen === "grid") {
      return (
        <GridScreen
          albumId={nav.albumId}
          settings={settings}
          catalog={catalog}
          onBack={goBack}
          onOpenViewer={openViewer}
        />
      );
    }
    return (
      <ViewerScreen
        albumId={nav.albumId}
        mediaId={nav.mediaId}
        settings={settings}
        catalog={catalog}
        onBack={goBack}
        onNavigate={openViewer}
      />
    );
  }, [nav, settings, catalog, closeApp, openGrid, openViewer, goBack]);

  return (
    <div className="pa-root" style={mergedRootStyle} {...rootDataAttrs}>
      <div className="pa-main">
        {tab === "album" ? (
          <PageTransition pageKey={pageKey} direction={transitionDirection}>
            {albumPage}
          </PageTransition>
        ) : (
          <CameraScreen
            closePhone={closePhone}
            onOpenCameraRoll={onOpenCameraRoll}
          />
        )}
      </div>
      <TabBar active={tab} onChange={onTabChange} />
    </div>
  );
}
