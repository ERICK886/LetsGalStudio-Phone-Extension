/**
 * @file phone-preview-catalog.ts
 * @description 编辑器预览用：只读解析 phone 模块桌面应用列表。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import {
  catalogFromSettingsRows,
  emptyPreferences,
  mergePhoneCatalog,
  resolvePhoneApps,
  type ResolvedPhoneApp,
} from "../../phone/catalog";
import { readPhoneSetting } from "./phone-settings-bridge";

/**
 * 从 phone 模块 settings 解析当前桌面应用（作者默认，不含玩家偏好覆盖）。
 *
 * @param ctx - 扩展上下文（phone-editor）
 * @returns 已解析的应用列表；解析失败时返回空数组（调用方可展示占位）
 *
 * @example
 * ```ts
 * const apps = readPhonePreviewApps(ctx);
 * ```
 */
export function readPhonePreviewApps(
  ctx: ExtensionContext,
): ResolvedPhoneApp[] {
  try {
    const catalogAppRows = readPhoneSetting(ctx, "catalogApps");
    const legacyCatalogActionRows = readPhoneSetting(ctx, "catalogActions");
    const legacyCatalogJson = readPhoneSetting(ctx, "appCatalogJson");
    const programUiActionRows = readPhoneSetting(ctx, "programUiActions");
    const visualUiActionRows = readPhoneSetting(ctx, "visualUiActions");
    const systemSlotActionRows = readPhoneSetting(ctx, "systemSlotActions");
    const internalMethodActionRows = readPhoneSetting(
      ctx,
      "internalMethodActions",
    );
    const inPhoneAppActionRows = readPhoneSetting(ctx, "inPhoneAppActions");

    const baseCatalog = catalogFromSettingsRows(
      legacyCatalogActionRows,
      catalogAppRows,
      legacyCatalogJson,
      {
        programUiActions: programUiActionRows,
        visualUiActions: visualUiActionRows,
        systemSlotActions: systemSlotActionRows,
        internalMethodActions: internalMethodActionRows,
        inPhoneAppActions: inPhoneAppActionRows,
      },
    );

    const prefs = emptyPreferences();
    const catalog = mergePhoneCatalog(baseCatalog, prefs);
    return resolvePhoneApps(catalog, prefs, []);
  } catch (err) {
    console.warn("[phone-editor] 解析预览桌面应用失败", err);
    return [];
  }
}
