/**
 * @file register.tsx
 * @description 向 Phone SDK 注册相册内页。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * 注册 `phoneAppId = phone-album` 的内页；render 委托给 `AlbumApp`。
 * title 取注册时缓存的 `getCachedAuthorSettings().appTitle`；设置变更不强制 re-register。
 */

import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";

import { PROGRAM_ID } from "../constants";
import { getCachedAuthorSettings } from "../runtime/index";
import { AlbumApp } from "./AlbumApp";

/**
 * 注册 `phoneAppId = phone-album` 的内页。
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
    render: (props) => <AlbumApp {...props} />,
  });
}
