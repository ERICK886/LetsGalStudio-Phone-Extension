/**
 * @file phone-editor-shell.tsx
 * @description 手机编辑器 Chakra UI 外壳：顶栏 + 可选竖栏导航 + 左中右三栏 body。
 * @author 池水三两升
 * @date 2026-08-29
 * @version 0.5.1
 *
 * @remarks
 * 顶栏 Tab 由调用方传入的 `sections` 决定（宿主固定区 + 已注册且 opt-in 的 APP）。
 * 可选 `navPane` / `leftPane` / `centerPane` / `rightPane` 替换对应区域。
 */

import { Box, Button, Flex, Text } from "@chakra-ui/react";
import React from "react";

import { BRAND_LABEL } from "../constants";
import type { PhoneEditorSection } from "../editor-sections";
import { COLOR_PICKER_SHELL_ATTR } from "../shared/color-picker";
import { IconLabel } from "../shared/fa-icon";
import { useTheme, FONT_SIZE_TITLE } from "../theme/theme-provider";
import { PlaceholderPane } from "./placeholder-pane";

/** PhoneEditorShell 组件属性。 */
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

/** 手机编辑器外壳。 */
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
  const leftWidthCss =
    typeof leftWidth === "number" ? `${leftWidth}px` : leftWidth;
  const rightWidthCss =
    typeof rightWidth === "number" ? `${rightWidth}px` : rightWidth;

  return (
    <Flex
      {...{ [COLOR_PICKER_SHELL_ATTR]: "" }}
      width="100%"
      height="100%"
      direction="column"
      background={tokens.bgBase}
      color={tokens.textPrimary}
      overflow="hidden"
    >
      <Flex
        role="toolbar"
        aria-label="手机编辑器顶栏"
        flex="0 0 auto"
        height="40px"
        align="center"
        gap="8px"
        paddingInline="10px"
        background={tokens.bgElevated}
        borderBottom={`1px solid ${tokens.border}`}
      >
        <Flex
          align="center"
          gap="8px"
          paddingRight="10px"
          marginRight="4px"
          borderRight={`1px solid ${tokens.border}`}
        >
          <Box
            aria-hidden="true"
            width="14px"
            height="14px"
            borderRadius="3px"
            background={tokens.accent}
          />
          <Text
            fontSize={`${FONT_SIZE_TITLE}px`}
            fontWeight="600"
            color={tokens.textPrimary}
            whiteSpace="nowrap"
          >
            {BRAND_LABEL}
          </Text>
        </Flex>

        <Flex
          role="tablist"
          aria-label="手机编辑器分区"
          align="center"
          gap="4px"
          flex="1 1 auto"
          overflowX="auto"
        >
          {sections.map((item) => {
            const selected = item.id === sectionId;
            return (
              <Button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={selected}
                data-testid={`phone-editor-section-${item.id}`}
                data-section-source={item.source}
                onClick={() => onSectionChange(item.id)}
                height="26px"
                minWidth="max-content"
                paddingInline="12px"
                borderRadius="4px"
                fontSize="12px"
                lineHeight="1"
                color={selected ? tokens.textPrimary : tokens.textSecondary}
                background={selected ? `${tokens.accent}22` : "transparent"}
                border={
                  selected
                    ? `1px solid ${tokens.accent}`
                    : "1px solid transparent"
                }
                fontWeight={selected ? "600" : "400"}
                flex="0 0 auto"
                _hover={{ background: `${tokens.accent}18` }}
              >
                {item.icon ? (
                  <IconLabel icon={item.icon}>{item.label}</IconLabel>
                ) : (
                  item.label
                )}
              </Button>
            );
          })}
        </Flex>

        <Flex align="center" gap="6px" flex="0 0 auto">
          <Button
            type="button"
            onClick={onToggleTheme}
            aria-label="切换主题"
            title={mode === "dark" ? "切换到浅色" : "切换到深色"}
            height="26px"
            paddingInline="10px"
            borderRadius="4px"
            border={`1px solid ${tokens.border}`}
            background="transparent"
            color={tokens.textSecondary}
            fontSize="12px"
            lineHeight="1"
            _hover={{ background: tokens.bgSunken }}
          >
            <IconLabel icon={mode === "dark" ? "sun" : "moon"}>
              {mode === "dark" ? "浅色" : "深色"}
            </IconLabel>
          </Button>
          <Button
            type="button"
            disabled
            title="运行预览（即将推出）"
            height="26px"
            paddingInline="10px"
            borderRadius="4px"
            border="1px solid transparent"
            background={tokens.accent}
            color="#FFFFFF"
            fontSize="12px"
            lineHeight="1"
            opacity="0.7"
          >
            <IconLabel icon="play">运行预览</IconLabel>
          </Button>
        </Flex>
      </Flex>

      <Flex flex="1 1 auto" direction="row" minHeight="0">
        {navPane ? (
          <Box
            flex={`0 0 ${navWidthCss}`}
            width={navWidthCss}
            padding="8px"
            borderRight={`1px solid ${tokens.border}`}
          >
            {navPane}
          </Box>
        ) : null}

        <Box
          flex={`0 0 ${leftWidthCss}`}
          width={leftWidthCss}
          padding="8px"
          borderRight={`1px solid ${tokens.border}`}
          minHeight="0"
        >
          {leftNode}
        </Box>

        <Box flex="1 1 0" minWidth="0" minHeight="0" padding="8px">
          {centerNode}
        </Box>

        <Box
          flex={`0 0 ${rightWidthCss}`}
          width={rightWidthCss}
          minHeight="0"
          padding="8px"
          borderLeft={`1px solid ${tokens.border}`}
        >
          {rightNode}
        </Box>
      </Flex>
    </Flex>
  );
}

export default PhoneEditorShell;
