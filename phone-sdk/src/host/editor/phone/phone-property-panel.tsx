/**
 * @file phone-property-panel.tsx
 * @description 编辑器右栏：按 schema 内容项渲染属性表单。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.3
 */

import { Box, Flex, Input, Text, Textarea, chakra } from "@chakra-ui/react";
import React, { useMemo } from "react";

import type { PhoneEditorContentItemSchema } from "../../../client/runtime/types";
import { AssetUriField } from "../shared/asset-uri-field";
import { CharacterAssetSelect } from "../shared/character-select";
import { ColorPicker } from "../shared/color-picker";
import { EnumSelect } from "../shared/enum-select";
import { ShortcutField } from "../shared/shortcut-field";
import { useTheme, FONT_SIZE_TITLE } from "../theme/theme-provider";
import type { ThemeTokens } from "../theme/tokens";
import { ChakraLabel, ChakraSpan } from "../shared/chakra-elements";

const ChakraCheckbox = chakra.input;

/**
 * PhonePropertyPanel 属性。
 */
export interface PhonePropertyPanelProps {
  /** 当前选中项 id。 */
  selectedId: string;
  /** 当前字段值表（id → string）。 */
  values: Record<string, string>;
  /** 分区 contentItems 目录。 */
  items: readonly PhoneEditorContentItemSchema[];
  /** settings 模块 id（展示用）。 */
  settingsModuleId: string;
  /**
   * 单字段变更。
   *
   * @param id - 内容项 id
   * @param value - 新字符串值
   */
  onChange: (id: string, value: string) => void;
}

const labelStyleBase: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  marginBottom: 6,
};

/**
 * 文本/下拉/多行控件统一样式。
 */
function controlStyleOf(tokens: ThemeTokens): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 9px",
    borderRadius: 4,
    fontSize: 12,
    outline: "none",
    color: tokens.textPrimary,
    background: tokens.bgSunken,
    border: `1px solid ${tokens.border}`,
  };
}

/**
 * 右栏属性表单。
 *
 * @param props - PhonePropertyPanelProps
 * @returns 属性面板
 */
export function PhonePropertyPanel({
  selectedId,
  values,
  items,
  settingsModuleId,
  onChange,
}: PhonePropertyPanelProps): React.ReactElement {
  const { tokens } = useTheme();
  const item = useMemo(
    () => items.find((entry) => entry.id === selectedId),
    [items, selectedId],
  );
  const value = values[selectedId] ?? item?.defaultValue ?? "";

  const labelStyle: React.CSSProperties = {
    ...labelStyleBase,
    color: tokens.textSecondary,
  };
  const controlStyle = controlStyleOf(tokens);

  if (!item) {
    return (
      <Box
        width="100%"
        minHeight="72px"
        color={tokens.textMuted}
        padding="12px"
      >
        未找到内容项
      </Box>
    );
  }

  const settingKey = item.settingKey?.trim() || item.id;
  const dependencyBlocked = Boolean(
    item.dependsOn &&
      (values[item.dependsOn.contentItemId] ?? "") !== item.dependsOn.equals,
  );

  return (
    <Flex
      width="100%"
      minHeight="0"
      direction="column"
      gap="12px"
      padding="12px"
      overflow="auto"
      background={tokens.bgElevated}
      border={`1px solid ${tokens.border}`}
      borderRadius="6px"
      opacity={dependencyBlocked ? 0.72 : 1}
    >
      <Box>
        <Text
          fontSize={`${FONT_SIZE_TITLE}px`}
          fontWeight="600"
          color={tokens.textPrimary}
          marginBottom="4px"
        >
          {item.label}
        </Text>
        {item.description ? (
          <Text
            fontSize="12px"
            color={tokens.textMuted}
            lineHeight="1.5"
          >
            {item.description}
          </Text>
        ) : null}
        {dependencyBlocked ? (
          <Text
            marginTop="8px"
            fontSize="12px"
            color={tokens.textMuted}
            lineHeight="1.5"
          >
            需先开启「
            {items.find((entry) => entry.id === item.dependsOn?.contentItemId)
              ?.label ?? item.dependsOn?.contentItemId}
            」后才可编辑。
          </Text>
        ) : null}
      </Box>

      <Box>
        {item.fieldType !== "boolean" && item.fieldType !== "shortcut" ? (
          <ChakraLabel style={labelStyle}>值</ChakraLabel>
        ) : null}

        {item.fieldType === "enum" && item.enumOptions ? (
          <EnumSelect
            value={value}
            onChange={(next) => onChange(item.id, next)}
            options={item.enumOptions}
            disabled={dependencyBlocked}
            clearable={item.allowEmpty === true}
            filterable={false}
            ariaLabel={item.label}
            placeholder="请选择"
          />
        ) : null}

        {item.fieldType === "color" ? (
          <ColorPicker
            value={value}
            onChange={(next) => onChange(item.id, next)}
            allowAlpha={false}
            disabled={dependencyBlocked}
            placeholder={item.defaultValue || "#RRGGBB"}
            ariaLabel={`${item.label} 取色`}
            tokens={tokens}
          />
        ) : null}

        {item.fieldType === "shortcut" ? (
          <ShortcutField
            value={value}
            onChange={(next) => onChange(item.id, next)}
            label="值"
            disabled={dependencyBlocked}
            placeholder={item.defaultValue || "点击后按下快捷键"}
            ariaLabel={`${item.label} 快捷键`}
            tokens={tokens}
          />
        ) : null}

        {item.fieldType === "boolean" ? (
          <Flex
            as="label"
            align="center"
            gap="8px"
            fontSize="12px"
            color={tokens.textPrimary}
          >
            <ChakraCheckbox
              type="checkbox"
              checked={value === "true"}
              disabled={dependencyBlocked}
              onChange={(e) =>
                onChange(item.id, e.target.checked ? "true" : "false")
              }
            />
            <ChakraSpan>启用</ChakraSpan>
          </Flex>
        ) : null}

        {item.fieldType === "number" ? (
          <Input
            type="number"
            style={controlStyle}
            value={value}
            min={item.min}
            max={item.max}
            step={item.step ?? 1}
            disabled={dependencyBlocked}
            onChange={(e) => onChange(item.id, e.target.value)}
            aria-label={`${item.label} 值`}
          />
        ) : null}

        {item.fieldType === "asset" ? (
          <AssetUriField
            value={value}
            assetKind={item.assetKind}
            disabled={dependencyBlocked}
            onChange={(next) => onChange(item.id, next)}
            placeholder="素材 URI（可空）"
            ariaLabel={`${item.label} 素材 URI`}
            tokens={tokens}
          />
        ) : null}

        {item.fieldType === "character" ? (
          <CharacterAssetSelect
            value={value}
            onChange={(next) => onChange(item.id, next)}
            allowEmpty={item.allowEmpty === true}
            disabled={dependencyBlocked}
            emptyLabel="（未选择角色）"
          />
        ) : null}

        {item.fieldType === "string" && item.multiline === true ? (
          <Textarea
            style={{ ...controlStyle, minHeight: 72, resize: "vertical" }}
            value={value}
            disabled={dependencyBlocked}
            onChange={(e) => onChange(item.id, e.target.value)}
            placeholder={item.defaultValue || undefined}
            aria-label={`${item.label} 值`}
          />
        ) : null}

        {item.fieldType === "string" && item.multiline !== true ? (
          <Input
            type="text"
            style={controlStyle}
            value={value}
            disabled={dependencyBlocked}
            onChange={(e) => onChange(item.id, e.target.value)}
            placeholder={item.defaultValue || undefined}
            aria-label={`${item.label} 值`}
          />
        ) : null}
      </Box>

      <Box
        marginTop="auto"
        fontSize="11px"
        color={tokens.textMuted}
        lineHeight="1.5"
      >
        写入模块{" "}
        <Box as="code">{item.settingsModuleId ?? settingsModuleId}</Box> · 键{" "}
        <Box as="code">{settingKey}</Box>
      </Box>
    </Flex>
  );
}

export default PhonePropertyPanel;
