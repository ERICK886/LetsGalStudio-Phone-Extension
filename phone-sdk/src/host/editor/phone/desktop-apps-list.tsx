/**
 * @file desktop-apps-list.tsx
 * @description 「桌面应用」页左栏：应用列表 + 添加 / 删除。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import React from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import { firstGlyph, resolveAssetUrl } from "../../phone/ui/asset-utils";
import { IconLabel } from "../shared/fa-icon";
import { useTheme, FONT_SIZE_DEFAULT } from "../theme/theme-provider";
import type { EditableCatalogApp } from "./desktop-apps-bridge";

/**
 * DesktopAppsList 属性。
 */
export interface DesktopAppsListProps {
  apps: readonly EditableCatalogApp[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

/**
 * 桌面应用列表。
 *
 * @param props - DesktopAppsListProps
 * @returns 左栏列表
 */
export function DesktopAppsList({
  apps,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
}: DesktopAppsListProps): React.ReactElement {
  const ctx = useExtensionContext();
  const { tokens } = useTheme();

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
        桌面应用
      </div>

      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {apps.map((app) => {
          const active = app.id === selectedId;
          const iconUrl = resolveAssetUrl(ctx, app.icon || undefined);

          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onSelect(app.id)}
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
                opacity: app.enabled ? 1 : 0.55,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  flex: "0 0 auto",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: tokens.bgSunken,
                  border: `1px solid ${tokens.border}`,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  firstGlyph(app.name)
                )}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {app.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 10,
                    color: tokens.textMuted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {app.id} · order {app.order}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, padding: "0 4px 4px" }}>
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
          disabled={!selectedId || apps.length <= 1}
          title={apps.length <= 1 ? "至少保留一个应用" : "删除选中应用"}
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
            cursor: apps.length <= 1 ? "not-allowed" : "pointer",
            opacity: apps.length <= 1 ? 0.5 : 1,
            fontSize: 12,
          }}
        >
          <IconLabel icon="trash">删除</IconLabel>
        </button>
      </div>
    </div>
  );
}

export default DesktopAppsList;
