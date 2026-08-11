/**
 * @file phone-host-editor-schema.ts
 * @description 宿主「手机」分区完整编辑 schema（contentItems + pages）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import type {
  PhoneEditorContentItemSchema,
  PhoneEditorPageSchema,
  PhoneEditorSectionSchema,
} from "../../../client/runtime/types";

/** 弹出位置枚举（与 host settings schema 对齐）。 */
const POPUP_POSITION_OPTIONS = [
  { value: "top-left", label: "左上" },
  { value: "top-center", label: "中上" },
  { value: "top-right", label: "右上" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-center", label: "中下" },
  { value: "bottom-right", label: "右下" },
  { value: "center", label: "中部" },
] as const;

/**
 * 宿主「手机」可编辑字段目录（一期外观）。
 * pages 通过 contentItemIds 引用此处 id。
 */
export const PHONE_HOST_CONTENT_ITEMS: readonly PhoneEditorContentItemSchema[] = [
  {
    id: "phoneTitle",
    group: "基础",
    label: "手机标题",
    icon: "mobile-screen",
    fieldType: "string",
    defaultValue: "手机",
    description: "状态栏 / 桌面等处展示的手机标题。",
  },
  {
    id: "phoneStylePreset",
    group: "基础",
    label: "样式预设",
    icon: "mobile",
    fieldType: "enum",
    defaultValue: "apple",
    description: "切换苹果 / 安卓外壳示意与内页过渡风格（运行时生效）。",
    enumOptions: [
      { value: "apple", label: "苹果手机（iPhone）" },
      { value: "android", label: "安卓手机（Android）" },
    ],
  },
  {
    id: "popupPosition",
    group: "弹出与快捷键",
    label: "弹出位置",
    icon: "up-right-and-down-left-from-center",
    fieldType: "enum",
    defaultValue: "bottom-right",
    description: "手机相对视口的弹出锚点。",
    enumOptions: [...POPUP_POSITION_OPTIONS],
  },
  {
    id: "openPhoneShortcut",
    group: "弹出与快捷键",
    label: "打开快捷键",
    icon: "keyboard",
    fieldType: "shortcut",
    defaultValue: "ArrowUp",
    description: "例如 ArrowUp、KeyP 或 Ctrl+KeyP。",
  },
  {
    id: "backgroundColor",
    group: "外观",
    label: "背景色",
    icon: "fill-drip",
    fieldType: "color",
    defaultValue: "#172036",
  },
  {
    id: "backgroundImage",
    group: "外观",
    label: "背景图",
    icon: "image",
    fieldType: "asset",
    defaultValue: "",
    allowEmpty: true,
    description: "Studio 图片素材 URI；可与背景色叠加。",
  },
  {
    id: "backgroundCss",
    group: "外观",
    label: "CSS 背景",
    icon: "code",
    fieldType: "string",
    defaultValue: "",
    allowEmpty: true,
    description: "例如 linear-gradient(135deg, #182848, #4b6cb7)。",
  },
  {
    id: "accentColor",
    group: "外观",
    label: "强调色",
    icon: "palette",
    fieldType: "color",
    defaultValue: "#79c7ff",
  },
  {
    id: "shellColor",
    group: "外观",
    label: "外壳色",
    icon: "square",
    fieldType: "color",
    defaultValue: "#11151f",
  },
  {
    id: "allowPlayerCustomization",
    group: "玩家权限",
    label: "允许玩家个性化手机",
    icon: "user-gear",
    fieldType: "boolean",
    defaultValue: "true",
    description:
      "关闭后隐藏玩家端个性化入口，并忽略玩家保存的名称、图标、背景、颜色等；数据不会删除。",
  },
  {
    id: "allowPlayerWallpaper",
    group: "玩家权限",
    label: "允许玩家更换背景",
    icon: "image",
    fieldType: "boolean",
    defaultValue: "true",
    dependsOn: {
      contentItemId: "allowPlayerCustomization",
      equals: "true",
    },
  },
  {
    id: "allowPlayerIcons",
    group: "玩家权限",
    label: "允许玩家更换图标",
    icon: "icons",
    fieldType: "boolean",
    defaultValue: "true",
    dependsOn: {
      contentItemId: "allowPlayerCustomization",
      equals: "true",
    },
  },
  {
    id: "markOutgoingUnreadReadBeforeIncoming",
    group: "消息手机",
    label: "对方回复前将我方未读标为已读",
    icon: "envelope-open",
    fieldType: "boolean",
    defaultValue: "true",
    description:
      "消息手机：屏幕已有我方「未读」且下一条为对方消息时，先标已读再推进对方消息。与聊天 APP 无关。",
  },
];

/** 主界面样式页：不含弹出位置 / 快捷键（归 popup-shortcut 页）。 */
const HOME_STYLE_CONTENT_IDS = [
  "phoneTitle",
  "phoneStylePreset",
  "backgroundColor",
  "backgroundImage",
  "backgroundCss",
  "accentColor",
  "shellColor",
] as const;

/** 弹出与快捷键页。 */
const POPUP_SHORTCUT_CONTENT_IDS = [
  "popupPosition",
  "openPhoneShortcut",
] as const;

/** 玩家权限页。 */
const PLAYER_PERMISSIONS_CONTENT_IDS = [
  "allowPlayerCustomization",
  "allowPlayerWallpaper",
  "allowPlayerIcons",
] as const;

/** 消息手机行为页。 */
const STORY_MESSAGE_BEHAVIOR_CONTENT_IDS = [
  "markOutgoingUnreadReadBeforeIncoming",
] as const;

/**
 * 宿主「手机」完整编辑 schema。
 *
 * @remarks
 * 手机 Tab 四栏完全由本对象驱动：竖栏 pages、内容项 contentItems、
 * settingsModuleId 决定 cross 读写目标。
 * 「消息角色预设 / 头像素材库 / 消息行为」属消息手机，与聊天 APP 分区分离。
 */
export const PHONE_HOST_EDITOR_SCHEMA: PhoneEditorSectionSchema = {
  sectionId: "phone",
  settingsModuleId: "phone",
  contentItems: [...PHONE_HOST_CONTENT_ITEMS],
  pages: [
    {
      id: "home-style",
      label: "主界面样式",
      icon: "mobile-screen",
      order: 10,
      status: "ready",
      contentItemIds: [...HOME_STYLE_CONTENT_IDS],
      preview: "desktop",
    },
    {
      id: "desktop-apps",
      label: "桌面应用",
      icon: "table-cells",
      order: 20,
      status: "ready",
      preview: "desktop",
      // 页内含「应用 | 动作」子切换：catalogApps + 五组动作表
    },
    {
      id: "popup-shortcut",
      label: "弹出与快捷键",
      icon: "keyboard",
      order: 30,
      status: "ready",
      contentItemIds: [...POPUP_SHORTCUT_CONTENT_IDS],
      preview: "desktop",
    },
    {
      id: "player-permissions",
      label: "玩家权限",
      icon: "user-shield",
      order: 40,
      status: "ready",
      contentItemIds: [...PLAYER_PERMISSIONS_CONTENT_IDS],
      preview: "desktop",
    },
    {
      id: "story-role-presets",
      label: "消息角色预设",
      icon: "user-tag",
      order: 50,
      status: "ready",
      preview: "chat",
      // 页内「预设 | 头像库」：chatRolePresets + chatAvatarAssets
    },
    {
      id: "story-message-behavior",
      label: "消息行为",
      icon: "envelope",
      order: 60,
      status: "ready",
      contentItemIds: [...STORY_MESSAGE_BEHAVIOR_CONTENT_IDS],
      preview: "chat",
    },
  ],
};

/**
 * 按 order 排序页面列表。
 *
 * @param pages - 原始页面
 * @returns 新数组（已排序）
 */
export function sortEditorPages(
  pages: readonly PhoneEditorPageSchema[],
): PhoneEditorPageSchema[] {
  return [...pages].sort(
    (a, b) => (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id),
  );
}

/**
 * 默认选中页：第一个 `ready`，否则第一个。
 *
 * @param pages - 页面列表
 * @returns 页面 id；空列表返回空串
 */
export function defaultEditorPageId(
  pages: readonly PhoneEditorPageSchema[],
): string {
  const sorted = sortEditorPages(pages);
  return (
    sorted.find((p) => (p.status ?? "ready") === "ready")?.id ??
    sorted[0]?.id ??
    ""
  );
}

/**
 * 在 schema 中查找页面。
 *
 * @param pages - 页面列表
 * @param pageId - 目标 id
 * @returns 页面；找不到则回落默认页
 */
export function resolveEditorPage(
  pages: readonly PhoneEditorPageSchema[],
  pageId: string,
): PhoneEditorPageSchema | null {
  const sorted = sortEditorPages(pages);
  if (sorted.length === 0) return null;
  return sorted.find((p) => p.id === pageId) ?? sorted[0] ?? null;
}

/**
 * 按页面 contentItemIds 从 section 目录解析内容项（保持声明顺序）。
 *
 * @param schema - 分区 schema
 * @param contentItemIds - 页面引用的 id；空则返回全部 contentItems
 * @returns 内容项列表
 */
export function resolvePageContentItems(
  schema: PhoneEditorSectionSchema,
  contentItemIds: string[] | undefined,
): PhoneEditorContentItemSchema[] {
  const catalog = schema.contentItems ?? [];
  if (!contentItemIds || contentItemIds.length === 0) {
    return [...catalog];
  }

  const map = new Map(catalog.map((item) => [item.id, item]));
  return contentItemIds
    .map((id) => map.get(id))
    .filter((item): item is PhoneEditorContentItemSchema => Boolean(item));
}

/**
 * 按 id 查找内容项。
 *
 * @param schema - 分区 schema
 * @param id - 内容项 id
 * @returns 内容项或 undefined
 */
export function getSectionContentItem(
  schema: PhoneEditorSectionSchema,
  id: string,
): PhoneEditorContentItemSchema | undefined {
  return schema.contentItems.find((item) => item.id === id);
}

/**
 * 内容项实际 settings 键。
 *
 * @param item - 内容项
 * @returns setting key
 */
export function contentItemSettingKey(
  item: PhoneEditorContentItemSchema,
): string {
  return item.settingKey?.trim() || item.id;
}
