/**
 * @file phone-editor-shell.tsx
 * @description 手机编辑器外壳：顶栏（品牌 + 分区 Tab + 主题切换 + 运行预览）与三栏占位 body 的整体骨架。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 顶栏左侧：accent 色块 + `BRAND_LABEL`（「手机」）。
 * - 顶栏中部：`role="tablist"`，4 个分区 Tab；选中态以 accent 描边 + `#DB277722` 底色表达。
 * - 顶栏右侧：主题切换按钮（调用 `onToggleTheme`）与「运行预览」按钮（`disabled`）。
 * - body：左 / 中 / 右三栏，左右栏宽度由 `leftWidth` / `rightWidth` 控制，中间栏 flex:1。
 * - 列间分隔线为 `1px solid tokens.border`；根容器 `height:100%` 纵向 flex。
 * - 实际分区内容在后续任务中替换 `PlaceholderPane`，本组件仅负责骨架与状态联动。
 */

import React from "react";
import { BRAND_LABEL, EDITOR_SECTIONS, type EditorSection } from "../constants";
import {
  useTheme,
  FONT_SIZE_TITLE,
} from "../theme/theme-provider";
import { PlaceholderPane } from "./placeholder-pane";

/**
 * PhoneEditorShell 组件属性。
 */
export interface PhoneEditorShellProps {
  /** 当前选中的分区 id。 */
  section: EditorSection;
  /** 切换分区回调。 */
  onSectionChange: (section: EditorSection) => void;
  /** 左栏宽度（CSS 长度，如 240 或 "240px"）。 */
  leftWidth: number | string;
  /** 右栏宽度。 */
  rightWidth: number | string;
  /** 切换主题模式回调（light / dark 之间切换）。 */
  onToggleTheme: () => void;
}

/**
 * 顶栏按钮的共用底样式：透明背景、圆角、次级文本色；hover/focus 由浏览器默认行为接管。
 * 主按钮（运行预览）在此基础上覆盖为白字 + accent 背景。
 */
const topBarButtonStyle: React.CSSProperties = {
  height: 26,
  paddingInline: 10,
  borderRadius: 4,
  border: "1px solid transparent",
  background: "transparent",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1,
};

/**
 * 手机编辑器外壳组件。
 *
 * @param props.section - 当前分区
 * @param props.onSectionChange - 切换分区
 * @param props.leftWidth - 左栏宽度
 * @param props.rightWidth - 右栏宽度
 * @param props.onToggleTheme - 切换主题
 * @returns 占满父容器、纵向布局的编辑器骨架
 */
export function PhoneEditorShell({
  section,
  onSectionChange,
  leftWidth,
  rightWidth,
  onToggleTheme,
}: PhoneEditorShellProps): React.ReactElement {
  const { tokens, mode } = useTheme();

  // 当前分区元数据：label 用于左右栏占位标题，centerHint 用于中间栏占位标题。
  const current =
    EDITOR_SECTIONS.find((item) => item.id === section) ?? EDITOR_SECTIONS[0];
  const sectionLabel = current.label;
  const centerHint = current.centerHint;

  return (
    <div
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
      {/* ===== 顶栏 ===== */}
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
        {/* 品牌：accent 色块 + 文案 */}
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

        {/* 分区 Tab 列表 */}
        <div
          role="tablist"
          aria-label="手机编辑器分区"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flex: "1 1 auto",
          }}
        >
          {EDITOR_SECTIONS.map((item) => {
            const selected = item.id === section;
            return (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={selected}
                data-testid={`phone-editor-section-${item.id}`}
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
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 右侧操作：主题切换 + 运行预览 */}
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
            {mode === "dark" ? "浅色" : "深色"}
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
            运行预览
          </button>
        </div>
      </div>

      {/* ===== body 三栏 ===== */}
      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "row",
          minHeight: 0,
        }}
      >
        {/* 左栏：导航 / 列表 */}
        <div
          style={{
            flex: `0 0 ${typeof leftWidth === "number" ? `${leftWidth}px` : leftWidth}`,
            width: typeof leftWidth === "number" ? `${leftWidth}px` : leftWidth,
            padding: 8,
            boxSizing: "border-box",
            borderRight: `1px solid ${tokens.border}`,
          }}
        >
          <PlaceholderPane title={`${sectionLabel} · 导航 / 列表`} />
        </div>

        {/* 中栏：主预览 */}
        <div
          style={{
            flex: "1 1 0",
            minWidth: 0,
            padding: 8,
            boxSizing: "border-box",
          }}
        >
          <PlaceholderPane title={centerHint} />
        </div>

        {/* 右栏：属性 */}
        <div
          style={{
            flex: `0 0 ${typeof rightWidth === "number" ? `${rightWidth}px` : rightWidth}`,
            width: typeof rightWidth === "number" ? `${rightWidth}px` : rightWidth,
            padding: 8,
            boxSizing: "border-box",
            borderLeft: `1px solid ${tokens.border}`,
          }}
        >
          <PlaceholderPane title={`${sectionLabel} · 属性`} />
        </div>
      </div>
    </div>
  );
}

export default PhoneEditorShell;
