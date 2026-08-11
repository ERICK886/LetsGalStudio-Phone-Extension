/**
 * @file phone-host-panes.tsx
 * @description 「手机」Tab：用 PHONE_HOST_EDITOR_SCHEMA 驱动四栏（薄封装）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 */

import { PHONE_HOST_EDITOR_SCHEMA } from "../schema/phone-host-editor-schema";
import {
  useSchemaEditorPanes,
  type SchemaEditorPaneNodes,
} from "../schema/use-schema-editor-panes";

/** @deprecated 使用 SchemaEditorPaneNodes */
export type PhoneHostPaneNodes = SchemaEditorPaneNodes;

/**
 * 「手机」分区四栏：完全由 `PHONE_HOST_EDITOR_SCHEMA` 驱动。
 *
 * @returns 四栏节点
 */
export function usePhoneHostPanes(): SchemaEditorPaneNodes {
  return useSchemaEditorPanes(PHONE_HOST_EDITOR_SCHEMA);
}
