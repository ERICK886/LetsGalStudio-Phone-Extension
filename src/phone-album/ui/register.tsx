/**
 * @file register.tsx
 * @description 向 Phone SDK 注册相册内页。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * 本文件为 Task 5 阶段的最小 stub：仅注册 phoneAppId = phone-album，
 * 渲染一个占位 div。Task 6 将替换 render 为真实相册内页组件。
 */

import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { PROGRAM_ID } from "../constants";

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
    title: "相册",
    description: "手机相册内页",
    render: () => (
      <div data-phone-album-stub style={{ padding: 16 }}>
        相册加载中…
      </div>
    ),
  });
}
