/**
 * @file editor-sections.ts
 * @description 根据宿主固定分区 + 已注册内页的 styleEditor 元数据，计算手机编辑器顶栏 Tab。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 宿主固定：外壳 / 桌面 / 其他（非内页）。
 * - 内页：仅 `registerPhoneApp({ styleEditor })` 且 `enabled !== false` 的 APP 出现。
 */

import { listRegisteredPhoneApps } from "../../client/runtime/register";
import type { PhoneAppRegistration } from "../../client/runtime/types";

/** 顶栏分区来源。 */
export type PhoneEditorSectionSource = "host" | "app";

/**
 * 编辑器顶栏一条分区。
 */
export interface PhoneEditorSection {
  /** 稳定 id：宿主为 shell/desktop/misc；内页为程序 id */
  id: string;
  /** Tab 文案 */
  label: string;
  /** 中栏占位说明 */
  centerHint: string;
  /** Font Awesome 图标名（不含 fa-）；可空 */
  icon?: string;
  /** 分区来源 */
  source: PhoneEditorSectionSource;
  /** 排序权重 */
  order: number;
}

/** 宿主固定分区（始终显示）。 */
export const HOST_EDITOR_SECTIONS: ReadonlyArray<PhoneEditorSection> = [
  {
    id: "shell",
    label: "外壳",
    centerHint: "手机外壳预览（即将推出）",
    icon: "mobile-screen",
    source: "host",
    order: 10,
  },
  {
    id: "desktop",
    label: "桌面",
    centerHint: "桌面图标样式（即将推出）",
    icon: "border-all",
    source: "host",
    order: 20,
  },
  {
    id: "misc",
    label: "其他",
    centerHint: "其它手机样式（即将推出）",
    icon: "sliders",
    source: "host",
    order: 1000,
  },
];

/**
 * 将一条已注册内页转为编辑器分区；未 opt-in 时返回 null。
 *
 * @param app - registerPhoneApp 描述
 * @returns PhoneEditorSection 或 null
 */
export function phoneAppToEditorSection(
  app: PhoneAppRegistration,
): PhoneEditorSection | null {
  const meta = app.styleEditor;
  if (!meta || meta.enabled === false) {
    return null;
  }

  const label =
    (meta.label && meta.label.trim()) ||
    (app.title && app.title.trim()) ||
    app.id;

  return {
    id: app.id,
    label,
    centerHint: `${label}样式（即将推出）`,
    icon: meta.icon?.trim() || "puzzle-piece",
    source: "app",
    order: typeof meta.order === "number" ? meta.order : 100,
  };
}

/**
 * 计算当前应显示的顶栏分区列表（宿主固定 + 已注册且 opt-in 的 APP）。
 *
 * @param apps - 可选显式传入；缺省读 `listRegisteredPhoneApps()`
 * @returns 按 order、再按 id 排序的分区数组
 *
 * @example
 * ```ts
 * const sections = buildPhoneEditorSections();
 * ```
 */
export function buildPhoneEditorSections(
  apps: readonly PhoneAppRegistration[] = listRegisteredPhoneApps(),
): PhoneEditorSection[] {
  const fromApps: PhoneEditorSection[] = [];
  for (const app of apps) {
    const section = phoneAppToEditorSection(app);
    if (section) fromApps.push(section);
  }

  return [...HOST_EDITOR_SECTIONS, ...fromApps].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
}

/**
 * 默认选中分区 id（优先外壳）。
 *
 * @param sections - 当前分区列表
 * @returns 分区 id
 */
export function defaultPhoneEditorSectionId(
  sections: readonly PhoneEditorSection[],
): string {
  return sections.find((s) => s.id === "shell")?.id ?? sections[0]?.id ?? "shell";
}
