/**
 * @file AlbumApp.tsx
 * @description Phone SDK 内页根：注入样式、订阅会话、按 screen 路由到三层屏幕。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * - 导航：home → grid → viewer；返回 viewer→grid→home→closeApp()。
 * - 只读：不提供上传 / 删除 UI。
 * - `albumId === ALL_ALBUM_ID` 时网格与查看器均使用 `catalog.allMedia`。
 */

import type { PhoneAppRenderProps } from "@ink-zenly/phone-sdk/plugin";
import React from "react";

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

  const { nav, settings, catalog, openGrid, openViewer, goBack } = session;

  return (
    <div className="pa-root" style={rootStyle}>
      {nav.screen === "home" ? (
        <HomeScreen
          settings={settings}
          catalog={catalog}
          onCloseApp={closeApp}
          onOpenGrid={openGrid}
        />
      ) : nav.screen === "grid" ? (
        <GridScreen
          albumId={nav.albumId}
          settings={settings}
          catalog={catalog}
          onBack={goBack}
          onOpenViewer={openViewer}
        />
      ) : (
        <ViewerScreen
          albumId={nav.albumId}
          mediaId={nav.mediaId}
          settings={settings}
          catalog={catalog}
          onBack={goBack}
          onNavigate={openViewer}
        />
      )}
    </div>
  );
}
