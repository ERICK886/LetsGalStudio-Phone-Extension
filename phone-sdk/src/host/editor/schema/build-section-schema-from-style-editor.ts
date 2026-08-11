/**
 * @file build-section-schema-from-style-editor.ts
 * @description 从 styleEditor 元数据构建 PhoneEditorSectionSchema（无 register 依赖）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import type {
  PhoneAppRegistration,
  PhoneEditorSectionSchema,
} from "../../../client/runtime/types";

/**
 * 从已注册 APP 的 styleEditor 元数据构建分区 schema。
 *
 * @param app - 已注册应用
 * @returns 完整 schema；元数据不完整时为 `null`
 */
export function buildSectionSchemaFromStyleEditor(
  app: PhoneAppRegistration,
): PhoneEditorSectionSchema | null {
  const meta = app.styleEditor;
  if (
    meta &&
    Array.isArray(meta.pages) &&
    meta.pages.length > 0 &&
    Array.isArray(meta.contentItems)
  ) {
    return {
      sectionId: app.id,
      settingsModuleId: meta.settingsModuleId?.trim() || app.id,
      contentItems: [...meta.contentItems],
      pages: [...meta.pages],
      resolveCustomPanes: meta.resolveCustomPanes,
    };
  }
  return null;
}
