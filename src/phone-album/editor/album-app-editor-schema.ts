/**
 * @file album-app-editor-schema.ts
 * @description 「相册APP」分区编辑 schema（文案 / 默认相册 / 默认媒体）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * 数组页（defaultAlbums / defaultMedia）由 custom panes 管理；标量文案走默认编辑器路径。
 */

import type {
  PhoneEditorContentItemSchema,
  PhoneEditorPageSchema,
  PhoneEditorSectionSchema,
} from "@ink-zenly/phone-sdk";

/** 相册模块 id（与 `@extension({ id: "phone-album" })` / `PROGRAM_ID` 一致）。 */
export const ALBUM_SETTINGS_MODULE_ID = "phone-album";

/**
 * 相册文案 contentItems（标量字段；数组页由 resolveAlbumCustomPanes 管理）。
 */
export const ALBUM_COPY_CONTENT_ITEMS: readonly PhoneEditorContentItemSchema[] = [
  {
    id: "appTitle",
    group: "文案",
    label: "应用标题",
    icon: "heading",
    fieldType: "string",
    defaultValue: "相册",
  },
  {
    id: "allAlbumsLabel",
    group: "文案",
    label: "「全部」显示名",
    icon: "layer-group",
    fieldType: "string",
    defaultValue: "全部",
  },
  {
    id: "emptyAlbumHint",
    group: "文案",
    label: "空相册提示",
    icon: "image",
    fieldType: "string",
    defaultValue: "这里还没有照片",
  },
];

const COPY_IDS = ["appTitle", "allAlbumsLabel", "emptyAlbumHint"] as const;

/**
 * 相册外观 contentItems（颜色 / 布局 / 自定义 CSS）。
 */
export const ALBUM_APPEARANCE_CONTENT_ITEMS: readonly PhoneEditorContentItemSchema[] = [
  {
    id: "styleBg",
    group: "颜色",
    label: "根背景",
    icon: "fill-drip",
    fieldType: "color",
    defaultValue: "#0F1419",
  },
  {
    id: "styleFg",
    group: "颜色",
    label: "主文字",
    icon: "font",
    fieldType: "color",
    defaultValue: "#F5F5F5",
  },
  {
    id: "styleFgMuted",
    group: "颜色",
    label: "次要文字",
    icon: "circle-half-stroke",
    fieldType: "color",
    defaultValue: "rgba(255,255,255,0.45)",
  },
  {
    id: "styleAccent",
    group: "颜色",
    label: "强调色",
    icon: "palette",
    fieldType: "color",
    defaultValue: "#7EC8FF",
  },
  {
    id: "styleHeaderBg",
    group: "颜色",
    label: "顶栏背景",
    icon: "heading",
    fieldType: "color",
    defaultValue: "#0F1419",
  },
  {
    id: "styleTabbarBg",
    group: "颜色",
    label: "Tab 栏背景",
    icon: "table-cells",
    fieldType: "color",
    defaultValue: "rgba(12,16,22,0.96)",
  },
  {
    id: "styleCardBg",
    group: "颜色",
    label: "卡片 / 媒体格底",
    icon: "image",
    fieldType: "color",
    defaultValue: "#1C232F",
  },
  {
    id: "styleDanger",
    group: "颜色",
    label: "危险操作",
    icon: "triangle-exclamation",
    fieldType: "color",
    defaultValue: "#FF6B7A",
  },
  {
    id: "styleCameraBg",
    group: "颜色",
    label: "拍照页背景",
    icon: "camera",
    fieldType: "color",
    defaultValue: "#05070A",
  },
  {
    id: "styleViewerBg",
    group: "颜色",
    label: "查看器背景",
    icon: "eye",
    fieldType: "color",
    defaultValue: "#000000",
  },
  {
    id: "styleHomeColumns",
    group: "布局",
    label: "首页列数",
    icon: "columns",
    fieldType: "enum",
    defaultValue: "2",
    enumOptions: [
      { value: "2", label: "2 列" },
      { value: "3", label: "3 列" },
    ],
  },
  {
    id: "styleGridColumns",
    group: "布局",
    label: "网格列数",
    icon: "grip",
    fieldType: "enum",
    defaultValue: "3",
    enumOptions: [
      { value: "3", label: "3 列" },
      { value: "4", label: "4 列" },
    ],
  },
  {
    id: "styleRadius",
    group: "布局",
    label: "圆角档",
    icon: "square",
    fieldType: "enum",
    defaultValue: "md",
    enumOptions: [
      { value: "sm", label: "小 (8px)" },
      { value: "md", label: "中 (12px)" },
      { value: "lg", label: "大 (16px)" },
    ],
  },
  {
    id: "styleCardGap",
    group: "布局",
    label: "间距档",
    icon: "arrows-left-right-to-line",
    fieldType: "enum",
    defaultValue: "md",
    enumOptions: [
      { value: "sm", label: "小 (6px)" },
      { value: "md", label: "中 (10px)" },
      { value: "lg", label: "大 (14px)" },
    ],
  },
  {
    id: "styleShowTabLabels",
    group: "布局",
    label: "Tab 显示文字",
    icon: "text",
    fieldType: "boolean",
    defaultValue: "true",
  },
  {
    id: "styleCustomCss",
    group: "自定义 CSS",
    label: "自定义 CSS",
    icon: "code",
    fieldType: "string",
    defaultValue: "",
    allowEmpty: true,
    multiline: true,
    description:
      "多行 CSS；空则不注入。包含 { 时原样注入（建议以 .pa-root 开头限定作用域）；否则自动包进 .pa-root[data-pa-author-skin] 作用域。",
  },
];

/** 全部外观 contentItem id。 */
const APPEARANCE_IDS = ALBUM_APPEARANCE_CONTENT_ITEMS.map((item) => item.id);

/**
 * 相册分区 contentItems 全集（文案 + 外观）。
 */
export const ALBUM_APP_CONTENT_ITEMS: readonly PhoneEditorContentItemSchema[] = [
  ...ALBUM_COPY_CONTENT_ITEMS,
  ...ALBUM_APPEARANCE_CONTENT_ITEMS,
];

/**
 * 相册分区页面列表。
 */
export const ALBUM_APP_EDITOR_PAGES: readonly PhoneEditorPageSchema[] = [
  {
    id: "album-copy",
    label: "文案与标签",
    icon: "font",
    order: 10,
    status: "ready",
    contentItemIds: [...COPY_IDS],
    preview: "placeholder",
  },
  {
    id: "album-catalog",
    label: "默认相册",
    icon: "folder",
    order: 20,
    status: "ready",
    contentItemIds: [],
    preview: "placeholder",
  },
  {
    id: "album-media",
    label: "默认媒体",
    icon: "photo-film",
    order: 30,
    status: "ready",
    contentItemIds: [],
    preview: "placeholder",
  },
  {
    id: "album-appearance",
    label: "外观",
    icon: "palette",
    order: 40,
    status: "ready",
    contentItemIds: [...APPEARANCE_IDS],
    preview: "placeholder",
  },
];

/**
 * 「相册APP」完整分区 schema。
 */
export const ALBUM_APP_EDITOR_SCHEMA: PhoneEditorSectionSchema = {
  sectionId: ALBUM_SETTINGS_MODULE_ID,
  settingsModuleId: ALBUM_SETTINGS_MODULE_ID,
  contentItems: [...ALBUM_APP_CONTENT_ITEMS],
  pages: [...ALBUM_APP_EDITOR_PAGES],
};
