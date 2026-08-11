/**
 * @file resolve-editor-section-schema.ts
 * @description 按顶栏分区 id 解析完整 PhoneEditorSectionSchema。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import { listRegisteredPhoneApps } from "../../../client/runtime/register";
import type { PhoneEditorSectionSchema } from "../../../client/runtime/types";
import { buildSectionSchemaFromStyleEditor } from "./build-section-schema-from-style-editor";
import { CHAT_APP_EDITOR_SCHEMA } from "./chat-app-editor-schema";
import { PHONE_HOST_EDITOR_SCHEMA } from "./phone-host-editor-schema";

/**
 * 无 pages 时的占位 schema（三栏 comingSoon）。
 *
 * @param sectionId - 分区 id
 * @returns 占位 schema
 */
export function placeholderSectionSchema(
  sectionId: string,
): PhoneEditorSectionSchema {
  return {
    sectionId,
    settingsModuleId: sectionId,
    contentItems: [],
    pages: [
      {
        id: "coming-soon",
        label: "即将推出",
        order: 10,
        status: "comingSoon",
        preview: "placeholder",
      },
    ],
  };
}

/**
 * 解析当前顶栏分区的编辑 schema。
 *
 * @param sectionId - 顶栏分区 id（`phone` / 程序 id）
 * @returns 完整 schema（未知 APP 回落占位）
 */
export function resolveEditorSectionSchema(
  sectionId: string,
): PhoneEditorSectionSchema {
  if (sectionId === "phone") {
    return PHONE_HOST_EDITOR_SCHEMA;
  }

  // 优先使用内置聊天 schema（与 register 声明一致，避免重复拷贝漂移）
  if (sectionId === "phone-chat" || sectionId === CHAT_APP_EDITOR_SCHEMA.sectionId) {
    return CHAT_APP_EDITOR_SCHEMA;
  }

  const app = listRegisteredPhoneApps().find((item) => item.id === sectionId);
  if (app) {
    const built = buildSectionSchemaFromStyleEditor(app);
    if (built) return built;
  }

  return placeholderSectionSchema(sectionId);
}
