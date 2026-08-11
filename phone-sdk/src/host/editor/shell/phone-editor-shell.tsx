/**
 * @file phone-editor-shell.tsx
 * @description 手机编辑器外壳：顶栏 + 可选竖栏导航 + 左中右三栏 body。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.4.0
 *
 * @remarks
 * 顶栏 Tab 由调用方传入的 `sections` 决定（宿主固定区 + 已注册且 opt-in 的 APP）。
 * 可选 `navPane` / `leftPane` / `centerPane` / `rightPane` 替换对应区域。
 */

import React from "react";

import { BRAND_LABEL } from "../constants";
import type { PhoneEditorSection } from "../editor-sections";
import { COLOR_PICKER_SHELL_ATTR } from "../shared/color-picker";
import { IconLabel } from "../shared/fa-icon";
import { useTheme, FONT_SIZE_TITLE } from "../theme/theme-provider";
import { PlaceholderPane } from "./placeholder-pane";

/**
 * PhoneEditorShell 组件属性。
 */
export interface PhoneEditorShellProps {
  /** 当前顶栏分区列表（已按 order 排好）。 */
  sections: readonly PhoneEditorSection[];
  /** 当前选中分区 id。 */
  sectionId: string;
  /** 切换分区。 */
  onSectionChange: (sectionId: string) => void;
  /** 左栏宽度。 */
  leftWidth: number | string;
  /** 右栏宽度。 */
  rightWidth: number | string;
  /** 最左竖栏宽度；仅在提供 `navPane` 时生效。 @default 72 */
  navWidth?: number | string;
  /** 切换主题。 */
  onToggleTheme: () => void;
  /** 可选最左竖向页面导航。 */
  navPane?: React.ReactNode;
  /** 可选左栏内容；缺省为占位。 */
  leftPane?: React.ReactNode;
  /** 可选中栏内容；缺省为占位。 */
  centerPane?: React.ReactNode;
  /** 可选右栏内容；缺省为占位。 */
  rightPane?: React.ReactNode;
}

const topBarButtonStyle: React.CSSProperties = {
  height: 26,
  paddingInline: 10,
  borderRadius: 4,
  border: "1px solid transparent",
  background: "transparent",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

/**
 * 手机编辑器外壳。
 *
 * @param props - PhoneEditorShellProps
 * @returns 占满父容器的编辑器骨架
 */
export function PhoneEditorShell({
  sections,
  sectionId,
  onSectionChange,
  leftWidth,
  rightWidth,
  navWidth = 72,
  onToggleTheme,
  navPane,
  leftPane,
  centerPane,
  rightPane,
}: PhoneEditorShellProps): React.ReactElement {
  const { tokens, mode } = useTheme();

  const current =
    sections.find((item) => item.id === sectionId) ?? sections[0] ?? null;
  const sectionLabel = current?.label ?? "分区";
  const centerHint = current?.centerHint ?? "样式预览（即将推出）";

  const leftNode = leftPane ?? (
    <PlaceholderPane title={`${sectionLabel} · 导航 / 列表`} />
  );
  const centerNode = centerPane ?? <PlaceholderPane title={centerHint} />;
  const rightNode = rightPane ?? (
    <PlaceholderPane title={`${sectionLabel} · 属性`} />
  );

  const navWidthCss =
    typeof navWidth === "number" ? `${navWidth}px` : navWidth;

  return (
    <div
      {...{ [COLOR_PICKER_SHELL_ATTR]: "" }}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: tokens.bgBase,
        color: tokens.textPrimary,
        overflow: "hidden",
      }}
    >
      <div
        role="toolbar"
        aria-label="手机编辑器顶栏"
        style={{
          flex: "0 0 auto",
          height: 40,
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingInline: 10,
          background: tokens.bgElevated,
          borderBottom: `1px solid ${tokens.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingRight: 10,
            marginRight: 4,
            borderRight: `1px solid ${tokens.border}`,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: tokens.accent,
            }}
          />
          <span
            style={{
              fontSize: FONT_SIZE_TITLE,
              fontWeight: 600,
              color: tokens.textPrimary,
            }}
          >
            {BRAND_LABEL}
          </span>
        </div>

        <div
          role="tablist"
          aria-label="手机编辑器分区"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flex: "1 1 auto",
            overflowX: "auto",
          }}
        >
          {sections.map((item) => {
            const selected = item.id === sectionId;
            return (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={selected}
                data-testid={`phone-editor-section-${item.id}`}
                data-section-source={item.source}
                onClick={() => onSectionChange(item.id)}
                style={{
                  height: 26,
                  paddingInline: 12,
                  borderRadius: 4,
                  fontSize: 12,
                  lineHeight: 1,
                  cursor: "pointer",
                  color: selected ? tokens.textPrimary : tokens.textSecondary,
                  background: selected ? `${tokens.accent}22` : "transparent",
                  border: selected
                    ? `1px solid ${tokens.accent}`
                    : `1px solid transparent`,
                  fontWeight: selected ? 600 : 400,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  flex: "0 0 auto",
                }}
              >
                {item.icon ? (
                  <IconLabel icon={item.icon}>{item.label}</IconLabel>
                ) : (
                  item.label
                )}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: "0 0 auto",
          }}
        >
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="切换主题"
            title={mode === "dark" ? "切换到浅色" : "切换到深色"}
            style={{
              ...topBarButtonStyle,
              color: tokens.textSecondary,
              border: `1px solid ${tokens.border}`,
            }}
          >
            <IconLabel icon={mode === "dark" ? "sun" : "moon"}>
              {mode === "dark" ? "浅色" : "深色"}
            </IconLabel>
          </button>
          <button
            type="button"
            disabled
            title="运行预览（即将推出）"
            style={{
              ...topBarButtonStyle,
              color: "#FFFFFF",
              background: tokens.accent,
              cursor: "not-allowed",
              opacity: 0.7,
            }}
          >
            <IconLabel icon="play">运行预览</IconLabel>
          </button>
        </div>
      </div>

      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "row",
          minHeight: 0,
        }}
      >
        {navPane ? (
          <div
            style={{
              flex: `0 0 ${navWidthCss}`,
              width: navWidthCss,
              padding: 8,
              boxSizing: "border-box",
              borderRight: `1px solid ${tokens.border}`,
            }}
          >
            {navPane}
          </div>
        ) : null}

        <div
          style={{
            flex: `0 0 ${typeof leftWidth === "number" ? `${leftWidth}px` : leftWidth}`,
            width: typeof leftWidth === "number" ? `${leftWidth}px` : leftWidth,
            padding: 8,
            boxSizing: "border-box",
            borderRight: `1px solid ${tokens.border}`,
          }}
        >
          {leftNode}
        </div>

        <div
          style={{
            flex: "1 1 0",
            minWidth: 0,
            padding: 8,
            boxSizing: "border-box",
          }}
        >
          {centerNode}
        </div>

        <div
          style={{
            flex: `0 0 ${typeof rightWidth === "number" ? `${rightWidth}px` : rightWidth}`,
            width:
              typeof rightWidth === "number" ? `${rightWidth}px` : rightWidth,
            padding: 8,
            boxSizing: "border-box",
            borderLeft: `1px solid ${tokens.border}`,
          }}
        >
          {rightNode}
        </div>
      </div>
    </div>
  );
}

export default PhoneEditorShell;
