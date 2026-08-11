/**
 * @file phone-content-list.tsx
 * @description 编辑器左栏：按 schema 内容项分组列表。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import React, { useMemo } from "react";

import type { PhoneEditorContentItemSchema } from "../../../client/runtime/types";
import { IconLabel } from "../shared/fa-icon";
import { useTheme, FONT_SIZE_DEFAULT } from "../theme/theme-provider";
import { groupPhoneContentItems } from "./phone-content-items";

/**
 * PhoneContentList 属性。
 */
export interface PhoneContentListProps {
  /** 当前选中内容项 id。 */
  selectedId: string;
  /**
   * 选中变更。
   *
   * @param id - 新选中 id
   */
  onSelect: (id: string) => void;
  /** 本页要展示的内容项（来自 schema）。 */
  items: readonly PhoneEditorContentItemSchema[];
}

/**
 * 左栏内容项列表。
 *
 * @param props - PhoneContentListProps
 * @returns 分组列表
 */
export function PhoneContentList({
  selectedId,
  onSelect,
  items,
}: PhoneContentListProps): React.ReactElement {
  const { tokens } = useTheme();
  const groups = useMemo(() => groupPhoneContentItems(items), [items]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 4,
        overflow: "auto",
        background: tokens.bgElevated,
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.4,
          color: tokens.textMuted,
          padding: "4px 8px 0",
          textTransform: "uppercase",
        }}
      >
        内容项
      </div>

      {groups.map(({ group, items: groupItems }) => (
        <div key={group} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontSize: 11,
              color: tokens.textSecondary,
              padding: "2px 8px",
              fontWeight: 600,
            }}
          >
            {group}
          </div>

          {groupItems.map((item) => {
            const active = item.id === selectedId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 4,
                  border: `1px solid ${active ? tokens.accent : "transparent"}`,
                  background: active ? `${tokens.accent}22` : "transparent",
                  color: active ? tokens.textPrimary : tokens.textSecondary,
                  cursor: "pointer",
                  fontSize: FONT_SIZE_DEFAULT,
                  lineHeight: 1.3,
                }}
              >
                <IconLabel icon={item.icon ?? "circle"}>{item.label}</IconLabel>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default PhoneContentList;
