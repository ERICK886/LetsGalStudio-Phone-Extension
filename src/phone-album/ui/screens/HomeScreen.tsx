/**
 * @file HomeScreen.tsx
 * @description 首页：标题 + 「全部」与各相册卡片网格。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import React from "react";

import type { AlbumCatalog } from "../../domain/index";
import type { AlbumAuthorSettings } from "../../types";
import { AlbumCard, AppHeader, EmptyHint } from "../components/index";

export interface HomeScreenProps {
  /** 作者设置（标题等） */
  settings: AlbumAuthorSettings;
  /** 相册目录 */
  catalog: AlbumCatalog;
  /** 关闭内页应用（home 层返回） */
  onCloseApp: () => void;
  /** 进入某相册网格 */
  onOpenGrid: (albumId: string) => void;
}

/**
 * @param props - HomeScreenProps
 * @returns 首页节点
 */
export function HomeScreen(props: HomeScreenProps) {
  const { settings, catalog, onCloseApp, onOpenGrid } = props;
  const albums = catalog.albums;

  return (
    <>
      <AppHeader title={settings.appTitle} onBack={onCloseApp} />
      <div className="pa-body">
        {albums.length === 0 ? (
          <EmptyHint text={settings.emptyAlbumHint} />
        ) : (
          <div className="pa-home-grid">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onOpen={onOpenGrid}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
