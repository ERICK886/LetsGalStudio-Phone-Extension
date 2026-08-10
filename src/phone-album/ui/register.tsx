/**
 * @file register.tsx
 * @description 向 Phone SDK 注册相册内页。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * 注册程序 ID = `phone-album` 的内页；render 委托给 `AlbumApp`。
 * title 取注册时缓存的 `getCachedAuthorSettings().appTitle`；设置变更不强制 re-register。
 * 宿主「动作 · 手机内部应用」须填 `phone-album`（程序 ID）。
 */

import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";

import { PROGRAM_ID } from "../constants";
import { getCachedAuthorSettings } from "../runtime/index";
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
    title: getCachedAuthorSettings().appTitle,
    description: "手机相册内页",
    styleEditor: {
      enabled: true,
      label: "相册",
      icon: "images",
      order: 110,
    },
    render: (props) => <AlbumApp {...props} />,
  });
}
