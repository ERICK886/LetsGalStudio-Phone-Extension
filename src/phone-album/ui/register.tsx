/**
 * @file register.tsx
 * @description 向 Phone SDK 注册相册内页。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * 注册程序 ID = `phone-album`；展示名 / 编辑器 Tab 为「相册APP」。
 * 宿主「动作 · 手机内部应用」须填 `phone-album`（程序 ID）。
 */

import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";

import { ALBUM_APP_EDITOR_SCHEMA } from "../editor/album-app-editor-schema";
import { resolveAlbumCustomPanes } from "../editor/resolve-album-custom-panes";
import { PROGRAM_ID } from "../constants";
import { AlbumApp } from "./AlbumApp";

/**
 * 注册程序 ID = `phone-album` 的内页（宿主绑定填 `phone-album` 即可）。
 *
 * @returns void
 *
 * @example
 * ```ts
 * static onRegister() {
 *   registerPhoneAlbumPhoneApp();
 * }
 * ```
 */
export function registerPhoneAlbumPhoneApp(): void {
  registerPhoneApp({
    id: PROGRAM_ID,
    title: "相册APP",
    description: "手机相册内页",
    styleEditor: {
      enabled: true,
      label: "相册APP",
      icon: "images",
      order: 110,
      settingsModuleId: ALBUM_APP_EDITOR_SCHEMA.settingsModuleId,
      contentItems: [...ALBUM_APP_EDITOR_SCHEMA.contentItems],
      pages: [...ALBUM_APP_EDITOR_SCHEMA.pages],
      resolveCustomPanes: resolveAlbumCustomPanes,
    },
    render: (props) => <AlbumApp {...props} />,
  });
}
