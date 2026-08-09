/**
 * @file AlbumApp.tsx
 * @description Phone SDK 内页根：注入样式、订阅会话、按 screen 路由并做页面过渡。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.2.0
 *
 * @remarks
 * - 导航：home → grid → viewer；返回 viewer→grid→home→closeApp()。
 * - 页面切换使用 PageTransition（前进滑动 / 后退滑动 / 查看器淡入淡出）。
 * - 只读：不提供上传 / 删除 UI。
 */

import type { PhoneAppRenderProps } from "@ink-zenly/phone-sdk/plugin";
import React, { useMemo } from "react";

import { PageTransition } from "./components/PageTransition";
import { useAlbumSession } from "./hooks/useAlbumSession";
import { useSafeAreaStyle } from "./hooks/useSafeAreaStyle";
import { GridScreen, HomeScreen, ViewerScreen } from "./screens/index";
import { ensureAlbumStyles } from "./styles/inject-styles";

/**
 * Phone SDK 内页根组件。
 *
 * @param props - PhoneAppRenderProps
 * @returns 嵌在手机屏幕内的 React 节点
 *
 * @example
 * ```tsx
 * render: (props) => <AlbumApp {...props} />
 * ```
 */
export function AlbumApp(props: PhoneAppRenderProps) {
  ensureAlbumStyles();

  const { closeApp, safeAreaInsets } = props;
  const session = useAlbumSession(closeApp);
  const rootStyle = useSafeAreaStyle(safeAreaInsets);

  const {
    nav,
    transitionDirection,
    settings,
    catalog,
    openGrid,
    openViewer,
    goBack,
  } = session;

  const pageKey = useMemo(() => {
    if (nav.screen === "home") return "home";
    if (nav.screen === "grid") return `grid:${nav.albumId}`;
    return `viewer:${nav.albumId}:${nav.mediaId}`;
  }, [nav]);

  const page = useMemo(() => {
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
    <div className="pa-root" style={rootStyle}>
      <PageTransition pageKey={pageKey} direction={transitionDirection}>
        {page}
      </PageTransition>
    </div>
  );
}
