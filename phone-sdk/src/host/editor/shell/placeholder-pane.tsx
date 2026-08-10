/**
 * @file placeholder-pane.tsx
 * @description 手机编辑器占位面板：在分区实际内容尚未实现前，以统一虚线边框 + 居中标题填充三栏布局。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 充满父容器（width/height 100%），背景取 `tokens.bgSunken`，虚线边框取 `tokens.border`。
 * - 标题居中，可选描述以次要文本色显示在标题下方。
 * - 仅消费 `useTheme`，不依赖任何业务上下文，便于后续被真实面板逐个替换。
 */

import React from "react";
import { useTheme, FONT_SIZE_TITLE } from "../theme/theme-provider";

/**
 * PlaceholderPane 组件属性。
 */
export interface PlaceholderPaneProps {
  /** 面板标题（一般由 Shell 拼接分区 label 与用途后缀传入）。 */
  title: string;
  /** 可选的次级描述，显示在标题下方。 */
  description?: string;
}

/**
 * 占位面板：以虚线边框 + 居中文案表达「此处待实现」。
 *
 * @param props.title - 面板标题
 * @param props.description - 可选描述
 * @returns 充满父容器的居中占位块
 *
 * @example
 * ```tsx
 * <PlaceholderPane title="外壳 · 导航 / 列表" />
 * ```
 */
export function PlaceholderPane({
  title,
  description,
}: PlaceholderPaneProps): React.ReactElement {
  const { tokens } = useTheme();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        gap: 6,
        background: tokens.bgSunken,
        border: `1px dashed ${tokens.border}`,
        color: tokens.textMuted,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: FONT_SIZE_TITLE,
          color: tokens.textSecondary,
          textAlign: "center",
          fontWeight: 600,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </div>
      {description ? (
        <div
          style={{
            fontSize: 12,
            color: tokens.textMuted,
            textAlign: "center",
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}

export default PlaceholderPane;
