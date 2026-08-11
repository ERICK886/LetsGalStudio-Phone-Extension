/**
 * @file desktop-apps-bridge.ts
 * @description 编辑器「桌面应用」页：读写 phone.catalogApps。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import { DEFAULT_CATALOG } from "../../phone/catalog";
import {
  readPhoneSetting,
  writePhoneSetting,
} from "./phone-settings-bridge";

/**
 * 可编辑的桌面应用行（与 Studio catalogApps 项对齐）。
 */
export interface EditableCatalogApp {
  id: string;
  name: string;
  /** 素材 URI；空串表示无自定义图标 */
  icon: string;
  order: number;
  preinstalled: boolean;
  enabled: boolean;
  locked: boolean;
  defaultActionId: string;
}

/**
 * 将未知行规范为 EditableCatalogApp；非法行丢弃。
 *
 * @param raw - settings 原始数组元素
 * @returns 规范化行或 null
 */
function normalizeRow(raw: unknown): EditableCatalogApp | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!id || !name) return null;

  const orderRaw = row.order;
  const order =
    typeof orderRaw === "number" && Number.isFinite(orderRaw)
      ? Math.max(0, Math.min(9999, Math.round(orderRaw)))
      : 0;

  return {
    id: id.slice(0, 64),
    name: name.slice(0, 24),
    icon: typeof row.icon === "string" ? row.icon : "",
    order,
    preinstalled: row.preinstalled !== false,
    enabled: row.enabled !== false,
    locked: row.locked === true,
    defaultActionId:
      typeof row.defaultActionId === "string" && row.defaultActionId.trim()
        ? row.defaultActionId.trim().slice(0, 64)
        : "settings",
  };
}

/**
 * 从内置默认目录生成可编辑草稿。
 *
 * @returns 默认应用行
 */
export function defaultEditableCatalogApps(): EditableCatalogApp[] {
  return DEFAULT_CATALOG.apps.map((app) => ({
    id: app.id,
    name: app.name,
    icon: app.icon ?? "",
    order: app.order,
    preinstalled: app.preinstalled !== false,
    enabled: app.enabled !== false,
    locked: app.locked === true,
    defaultActionId: app.defaultActionId,
  }));
}

/**
 * 读取可编辑桌面应用列表。
 * `catalogApps` 为空时回退内置目录（尚未落盘的草稿）。
 *
 * @param ctx - 扩展上下文
 * @returns 应用行（已按 order、原序排序）
 */
export function readEditableCatalogApps(
  ctx: ExtensionContext,
): EditableCatalogApp[] {
  const raw = readPhoneSetting(ctx, "catalogApps");
  if (Array.isArray(raw) && raw.length > 0) {
    const apps: EditableCatalogApp[] = [];
    const seen = new Set<string>();
    for (const item of raw.slice(0, 40)) {
      const row = normalizeRow(item);
      if (!row || seen.has(row.id)) continue;
      seen.add(row.id);
      apps.push(row);
    }
    if (apps.length > 0) {
      return sortEditableApps(apps);
    }
  }
  return defaultEditableCatalogApps();
}

/**
 * 写入完整 catalogApps（覆盖）。
 *
 * @param ctx - 扩展上下文
 * @param apps - 应用行
 * @returns 是否成功
 */
export function writeEditableCatalogApps(
  ctx: ExtensionContext,
  apps: readonly EditableCatalogApp[],
): boolean {
  const payload = sortEditableApps([...apps]).slice(0, 40).map((app) => ({
    id: app.id,
    name: app.name,
    ...(app.icon.trim() ? { icon: app.icon } : {}),
    order: app.order,
    preinstalled: app.preinstalled,
    enabled: app.enabled,
    locked: app.locked,
    defaultActionId: app.defaultActionId,
  }));
  return writePhoneSetting(ctx, "catalogApps", payload);
}

/**
 * 按 order 升序、同 order 保持相对顺序。
 *
 * @param apps - 应用行
 * @returns 新数组
 */
export function sortEditableApps(
  apps: EditableCatalogApp[],
): EditableCatalogApp[] {
  return [...apps]
    .map((app, index) => ({ app, index }))
    .sort((a, b) => a.app.order - b.app.order || a.index - b.index)
    .map(({ app }) => app);
}

/**
 * 生成不冲突的新应用 id。
 *
 * @param existing - 已有 id 集合
 * @param base - 基础名
 * @returns 新 id
 */
export function nextCatalogAppId(
  existing: ReadonlySet<string>,
  base = "new-app",
): string {
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/**
 * 创建默认新应用行。
 *
 * @param existingIds - 已有 id
 * @param defaultActionId - 默认动作 ID（通常取当前动作列表首项）
 * @returns 新行
 */
export function createBlankCatalogApp(
  existingIds: ReadonlySet<string>,
  defaultActionId = "settings",
): EditableCatalogApp {
  const id = nextCatalogAppId(existingIds);
  return {
    id,
    name: "新应用",
    icon: "",
    order: 0,
    preinstalled: true,
    enabled: true,
    locked: false,
    defaultActionId: defaultActionId.trim() || "settings",
  };
}
