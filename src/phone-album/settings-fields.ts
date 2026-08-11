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
    styleBg: s.color("根背景").default("#0F1419"),
    styleFg: s.color("主文字").default("#F5F5F5"),
    styleFgMuted: s.color("次要文字").default("rgba(255,255,255,0.45)"),
    styleAccent: s.color("强调色").default("#7EC8FF"),
    styleHeaderBg: s.color("顶栏背景").default("#0F1419"),
    styleTabbarBg: s.color("Tab 栏背景").default("rgba(12,16,22,0.96)"),
    styleCardBg: s.color("卡片 / 媒体格底").default("#1C232F"),
    styleDanger: s.color("危险操作").default("#FF6B7A"),
    styleCameraBg: s.color("拍照页背景").default("#05070A"),
    styleViewerBg: s.color("查看器背景").default("#000000"),
    styleHomeColumns: s
      .enum("首页列数", ["2", "3"] as const)
      .default("2")
      .labels({ "2": "2 列", "3": "3 列" }),
    styleGridColumns: s
      .enum("网格列数", ["3", "4"] as const)
      .default("3")
      .labels({ "3": "3 列", "4": "4 列" }),
    styleRadius: s
      .enum("圆角档", ["sm", "md", "lg"] as const)
      .default("md")
      .labels({ sm: "小 (8px)", md: "中 (12px)", lg: "大 (16px)" }),
    styleCardGap: s
      .enum("间距档", ["sm", "md", "lg"] as const)
      .default("md")
      .labels({ sm: "小 (6px)", md: "中 (10px)", lg: "大 (14px)" }),
    styleShowTabLabels: s.boolean("Tab 显示文字").default(true),
    styleCustomCss: s
      .string("自定义 CSS")
      .default("")
      .describe("多行 CSS；空则不注入。建议以 .pa-root 开头限定作用域。"),
  };
}
