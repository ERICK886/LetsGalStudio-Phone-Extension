/**
 * @file desktop-actions-list.tsx
 * @description 「桌面应用」页 · 动作子页：左栏动作列表 + 按种类添加。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.1
 */

import React from "react";

import { IconLabel } from "../shared/fa-icon";
import { useTheme, FONT_SIZE_DEFAULT } from "../theme/theme-provider";
import {
  ACTION_KIND_LABELS,
  EDITABLE_ACTION_KINDS,
  type EditableActionKind,
  type EditableCatalogAction,
} from "./desktop-actions-bridge";

/**
 * DesktopActionsList 属性。
 */
export interface DesktopActionsListProps {
  actions: readonly EditableCatalogAction[];
  selectedId: string;
  /** 当前添加用的动作种类 */
  addKind: EditableActionKind;
  onAddKindChange: (kind: EditableActionKind) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

/**
 * 动作列表（按种类分组展示）。
 *
 * @param props - DesktopActionsListProps
 * @returns 左栏列表
 */
export function DesktopActionsList({
  actions,
  selectedId,
  addKind,
  onAddKindChange,
  onSelect,
  onAdd,
  onDelete,
}: DesktopActionsListProps): React.ReactElement {
  const { tokens } = useTheme();

  const grouped = EDITABLE_ACTION_KINDS.map((kind) => ({
    kind,
    items: actions.filter((action) => action.kind === kind),
  })).filter((group) => group.items.length > 0);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 4,
        overflow: "hidden",
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
        动作目录
      </div>

      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "0 2px",
        }}
      >
        {grouped.length === 0 ? (
          <div
            style={{
              padding: 12,
              fontSize: FONT_SIZE_DEFAULT,
              color: tokens.textMuted,
            }}
          >
            暂无动作，点击下方添加。
          </div>
        ) : (
          grouped.map((group) => (
            <section
              key={group.kind}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                borderRadius: 6,
                border: `1px solid ${tokens.border}`,
                background: tokens.bgSunken,
                overflow: "hidden",
              }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "7px 10px",
                  borderBottom: `1px solid ${tokens.border}`,
                  background: tokens.bgElevated,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.2,
                    color: tokens.textPrimary,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 3,
                      height: 12,
                      borderRadius: 2,
                      flex: "0 0 auto",
                      background: tokens.accent,
                    }}
                  />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ACTION_KIND_LABELS[group.kind]}
                  </span>
                </span>
                <span
                  style={{
                    flex: "0 0 auto",
                    minWidth: 18,
                    height: 18,
                    paddingInline: 6,
                    borderRadius: 9,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 600,
                    color: tokens.textMuted,
                    background: tokens.bgSunken,
                    border: `1px solid ${tokens.border}`,
                  }}
                >
                  {group.items.length}
                </span>
              </header>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  padding: "4px 4px 6px",
                }}
              >
                {group.items.map((action) => {
                  const active = action.id === selectedId;
                  return (
                    <button
                      key={`${action.kind}:${action.id}`}
                      type="button"
                      onClick={() => onSelect(action.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: 4,
                        border: `1px solid ${active ? tokens.accent : "transparent"}`,
                        background: active ? `${tokens.accent}22` : "transparent",
                        color: active ? tokens.textPrimary : tokens.textSecondary,
                        cursor: "pointer",
                        fontSize: FONT_SIZE_DEFAULT,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: active ? 600 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "100%",
                        }}
                      >
                        {action.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: tokens.textMuted,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "100%",
                        }}
                      >
                        {action.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "0 4px 4px",
        }}
      >
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 11,
            color: tokens.textMuted,
          }}
        >
          添加种类
          <select
            value={addKind}
            onChange={(e) =>
              onAddKindChange(e.target.value as EditableActionKind)
            }
            style={{
              height: 30,
              borderRadius: 4,
              border: `1px solid ${tokens.border}`,
              background: tokens.bgSunken,
              color: tokens.textPrimary,
              fontSize: 12,
              padding: "0 8px",
            }}
          >
            {EDITABLE_ACTION_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {ACTION_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={onAdd}
            style={{
              flex: 1,
              height: 30,
              borderRadius: 4,
              border: `1px solid ${tokens.border}`,
              background: tokens.bgSunken,
              color: tokens.textPrimary,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <IconLabel icon="plus">添加</IconLabel>
          </button>
          <button
            type="button"
            disabled={!selectedId || actions.length <= 1}
            title={actions.length <= 1 ? "至少保留一个动作" : "删除选中动作"}
            onClick={() => {
              if (selectedId) onDelete(selectedId);
            }}
            style={{
              flex: 1,
              height: 30,
              borderRadius: 4,
              border: `1px solid ${tokens.border}`,
              background: tokens.bgSunken,
              color: tokens.textSecondary,
              cursor: actions.length <= 1 ? "not-allowed" : "pointer",
              opacity: actions.length <= 1 ? 0.5 : 1,
              fontSize: 12,
            }}
          >
            <IconLabel icon="trash">删除</IconLabel>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DesktopActionsList;
