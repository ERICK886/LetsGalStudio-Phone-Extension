/**
 * @file settings-fields.ts
 * @description 相册模块作者设置字段（本模块独立 settings，无需 album 前缀）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import type { SettingsBuilder, AnyFieldBuilder } from "@avg-studio/sdk";

/**
 * 构造相册模块作者设置字段。
 *
 * @param s - `settings((s) => …)` 中的 builder
 * @returns 字段映射
 */
export function buildAlbumSettingsFields(
  s: SettingsBuilder,
): Record<string, AnyFieldBuilder> {
  return {
    appTitle: s.string("应用标题").default("相册"),
    allAlbumsLabel: s.string("「全部」显示名").default("全部"),
    emptyAlbumHint: s.string("空相册提示").default("这里还没有照片"),
    defaultAlbums: s
      .array("默认相册", (item) => ({
        id: item.string("相册 ID").default("album-1"),
        name: item.string("名称").default("默认相册"),
        coverAsset: item.asset("封面（可选）").accepts("image"),
      }))
      .maxItems(40)
      .addLabel("添加默认相册"),
    defaultMedia: s
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
