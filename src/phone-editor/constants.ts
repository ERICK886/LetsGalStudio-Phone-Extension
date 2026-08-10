/**
 * @file constants.ts
 * @description 手机编辑器模块常量：程序 ID、品牌与分区元数据。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

/** Studio 程序 ID / `@extension({ id })`。 */
export const PROGRAM_ID = "phone-editor";

/** 顶栏品牌文案（与场景交互「场景交互」对称，此处为「手机」）。 */
export const BRAND_LABEL = "手机";

/** 扩展程序标签（Studio 程序列表显示名）。 */
export const MODULE_LABEL = "手机编辑器";

/** 编辑器顶部分区。 */
export type EditorSection = "shell" | "desktop" | "chat" | "misc";

/**
 * 分区元数据（顺序即 Tab 顺序）。
 */
export const EDITOR_SECTIONS: ReadonlyArray<{
  id: EditorSection;
  label: string;
  centerHint: string;
}> = [
  { id: "shell", label: "外壳", centerHint: "手机外壳预览（即将推出）" },
  { id: "desktop", label: "桌面", centerHint: "桌面图标样式（即将推出）" },
  { id: "chat", label: "聊天气泡", centerHint: "气泡主题预览（即将推出）" },
  { id: "misc", label: "其他", centerHint: "其它手机样式（即将推出）" },
];
