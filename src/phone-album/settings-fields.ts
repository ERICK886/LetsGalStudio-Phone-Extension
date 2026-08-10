/**
 * @file settings-fields.ts
 * @description 相册内页作者设置字段工厂：返回带 `album` 前缀的字段定义，
 *              供宿主 `StudioPhoneExtension` 在 `static settings` 中合并。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 字段名一律以 `album` 前缀（如 `albumAppTitle`、`albumDefaultAlbums`），
 *   避免与宿主手机壳字段（`phoneTitle` 等）或聊天模块字段（`chat*`）冲突。
 * - `runtime/settings.ts` 的 `readAuthorSettings` 必须以相同前缀读取。
 * - 函数签名接收 `SettingsBuilder`，返回字段映射；不在本模块调用 `settings()`。
 */

import type { SettingsBuilder, AnyFieldBuilder } from "@avg-studio/sdk";

/**
 * 构造相册内页作者设置字段（带 `album` 前缀）。
 *
 * @param s - 宿主传入的 `SettingsBuilder`（即 `settings((s) => …)` 中的 `s`）
 * @returns 字段名 → 字段构建器，供宿主合并到 `static settings`
 *
 * @example
 * ```ts
 * static settings = settings((s) => ({
 *   ...buildPhoneHostSettingsFields(s),
 *   ...buildChatSettingsFields(s),
 *   ...buildAlbumSettingsFields(s),
 * }));
 * ```
 */
export function buildAlbumSettingsFields(
  s: SettingsBuilder,
): Record<string, AnyFieldBuilder> {
  return {
    albumAppTitle: s.string("应用标题").default("相册"),
    albumAllAlbumsLabel: s.string("「全部」显示名").default("全部"),
    albumEmptyAlbumHint: s.string("空相册提示").default("这里还没有照片"),
    albumDefaultAlbums: s
      .array("默认相册", (item) => ({
        id: item.string("相册 ID").default("album-1"),
        name: item.string("名称").default("默认相册"),
        coverAsset: item.asset("封面（可选）").accepts("image"),
      }))
      .maxItems(40)
      .addLabel("添加默认相册"),
    albumDefaultMedia: s
      .array("默认媒体", (item) => ({
        id: item.string("媒体 ID").default("media-1"),
        type: item.string("类型 image|video").default("image"),
        asset: item.asset("素材").accepts("any"),
        albumIds: item
          .string("所属相册 ID")
          .default("")
          .describe("逗号分隔，可属多个相册"),
        durationSec: item.number("视频时长秒（可选）").default(0),
        posterAsset: item
          .asset("视频封面图（可选）")
          .accepts("image")
          .describe("网格缩略优先用此图；未填则尝试抽视频首帧"),
      }))
      .maxItems(200)
      .addLabel("添加默认媒体"),
  };
}
