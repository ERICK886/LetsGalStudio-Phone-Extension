/**
 * @file color-picker.tsx
 * @description 基于 Chakra UI 官方 ColorPicker 的编辑器颜色字段。
 * @author 池水三两升
 * @date 2026-08-30
 * @version 0.2.0
 *
 * @remarks
 * 对外继续接收和写回 CSS HEX 字符串；色域、色相、透明度、吸管、键盘
 * 交互及弹层定位均交由 Chakra UI ColorPicker（Ark UI）负责。
 */

import {
  Box,
  ColorPicker as ChakraColorPicker,
  HStack,
  Portal,
  Stack,
  Text,
  parseColor,
  type Color,
} from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";

import { useTheme } from "../theme/theme-provider";
import type { ThemeTokens } from "../theme/tokens";

/** 编辑器壳根节点标记；EnumSelect 继续用它夹紧自定义弹层。 */
export const COLOR_PICKER_SHELL_ATTR = "data-color-picker-shell";

/** ColorPicker 的兼容属性。 */
export interface ColorPickerProps {
  /** 当前 CSS 颜色；空串显示 placeholder。 */
  value: string;
  /** 写回 #RRGGBB，启用透明度时写回 #RRGGBBAA。 */
  onChange: (css: string) => void;
  /** 是否显示并写回 Alpha 通道。 @default false */
  allowAlpha?: boolean;
  /** 可选字段标签。 */
  label?: string;
  /** 是否禁用。 */
  disabled?: boolean;
  /** 空值提示。 */
  placeholder?: string;
  /** 可选编辑器主题 token。 */
  tokens?: ThemeTokens;
  /** 触发器无障碍名称。 */
  ariaLabel?: string;
}

/** 内部 RGBA（RGB 0–255，Alpha 0–1）。 */
interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** 将数值限制在闭区间。 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 尝试解析编辑器支持的 CSS 颜色。
 *
 * 保留该导出以兼容既有调用；官方 ColorPicker 的交互值由 `parseColor`
 * 管理，这里只负责旧字符串接口的规范化。
 */
export function tryParseCssColor(css: string): Rgba | null {
  const text = css.trim();
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(
    text,
  );

  if (hex) {
    let value = hex[1];
    if (value.length === 3) {
      value = value
        .split("")
        .map((part) => `${part}${part}`)
        .join("");
    }

    return {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16),
      a:
        value.length === 8
          ? Number.parseInt(value.slice(6, 8), 16) / 255
          : 1,
    };
  }

  const rgba =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(
      text,
    );

  if (!rgba) return null;

  return {
    r: clamp(Number(rgba[1]), 0, 255),
    g: clamp(Number(rgba[2]), 0, 255),
    b: clamp(Number(rgba[3]), 0, 255),
    a: rgba[4] === undefined ? 1 : clamp(Number(rgba[4]), 0, 1),
  };
}

/** 解析 CSS 颜色；非法值回退为不透明白。 */
export function parseCssColor(css: string): Rgba {
  return tryParseCssColor(css) ?? { r: 255, g: 255, b: 255, a: 1 };
}

/** RGBA 转大写 HEX/HEXA。 */
export function rgbaToHex(rgba: Rgba, withAlpha: boolean): string {
  const channel = (value: number) =>
    clamp(Math.round(value), 0, 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  const hex = `#${channel(rgba.r)}${channel(rgba.g)}${channel(rgba.b)}`;
  return withAlpha ? `${hex}${channel(rgba.a * 255)}` : hex;
}

/** 把外部字符串转换为 Chakra 的受控颜色对象。 */
function toChakraColor(value: string, allowAlpha: boolean): Color {
  return parseColor(rgbaToHex(parseCssColor(value), allowAlpha));
}

/** 将 Chakra 颜色对象写回旧编辑器所需的规范 HEX。 */
function fromChakraColor(value: Color, allowAlpha: boolean): string {
  return value.toString(allowAlpha ? "hexa" : "hex").toUpperCase();
}

/**
 * Chakra UI 官方颜色选择器的兼容包装。
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  allowAlpha = false,
  label,
  disabled = false,
  placeholder = "#RRGGBB",
  tokens,
  ariaLabel = "选择颜色",
}) => {
  const { tokens: contextTokens } = useTheme();
  const themeTokens = tokens ?? contextTokens;
  const isEmpty = value.trim().length === 0;
  const externalColor = useMemo(
    () => toChakraColor(value, allowAlpha),
    [allowAlpha, value],
  );
  const [draft, setDraft] = useState<Color>(externalColor);

  useEffect(() => {
    setDraft(externalColor);
  }, [externalColor]);

  const displayValue = isEmpty
    ? placeholder
    : fromChakraColor(draft, allowAlpha);

  return (
    <ChakraColorPicker.Root
      value={draft}
      format="rgba"
      disabled={disabled}
      closeOnSelect={false}
      positioning={{ placement: "left-start", gutter: 6 }}
      onValueChange={(details) => setDraft(details.value)}
      onValueChangeEnd={(details) =>
        onChange(fromChakraColor(details.value, allowAlpha))
      }
      width="100%"
      display="flex"
      flexDirection="column"
      gap="6px"
      fontFamily="system-ui, sans-serif"
      fontSize="12px"
    >
      <ChakraColorPicker.HiddenInput />

      {label ? (
        <ChakraColorPicker.Label
          color={themeTokens.textMuted}
          fontWeight="500"
        >
          {label}
        </ChakraColorPicker.Label>
      ) : null}

      <ChakraColorPicker.Control width="100%">
        <ChakraColorPicker.Trigger
          type="button"
          aria-label={ariaLabel}
          width="100%"
          minHeight="38px"
          padding="4px"
          justifyContent="flex-start"
          gap="8px"
          borderRadius="8px"
          border={`1px solid ${themeTokens.border}`}
          background={themeTokens.bgSunken}
          color={themeTokens.textPrimary}
          opacity={disabled ? 0.5 : 1}
          cursor={disabled ? "not-allowed" : "pointer"}
        >
          {isEmpty ? (
            <Box
              boxSize="28px"
              flex="0 0 auto"
              borderRadius="6px"
              border={`1px dashed ${themeTokens.borderStrong}`}
            />
          ) : (
            <ChakraColorPicker.ValueSwatch
              boxSize="28px"
              flex="0 0 auto"
              borderRadius="6px"
              border={`1px solid ${themeTokens.border}`}
            />
          )}
          <Text
            minWidth="0"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            color={isEmpty ? themeTokens.textMuted : themeTokens.textPrimary}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
            fontSize="12px"
          >
            {displayValue}
          </Text>
        </ChakraColorPicker.Trigger>
      </ChakraColorPicker.Control>

      <Portal>
        <ChakraColorPicker.Positioner>
          <ChakraColorPicker.Content
            width="260px"
            padding="12px"
            borderRadius="10px"
            border={`1px solid ${themeTokens.border}`}
            background={themeTokens.bgElevated}
            color={themeTokens.textPrimary}
            boxShadow="0 12px 40px rgba(0, 0, 0, 0.55)"
            zIndex="10000"
          >
            <Stack gap="10px">
              <ChakraColorPicker.Area height="180px" borderRadius="8px" />

              <HStack gap="8px">
                <ChakraColorPicker.EyeDropper
                  size="sm"
                  aria-label="从屏幕吸取颜色"
                  title="从屏幕吸取颜色"
                />
                <Stack flex="1" gap="8px" paddingInline="2px">
                  <ChakraColorPicker.ChannelSlider channel="hue" />
                  {allowAlpha ? (
                    <ChakraColorPicker.ChannelSlider channel="alpha" />
                  ) : null}
                </Stack>
              </HStack>

              <HStack gap="8px" align="flex-end">
                <ChakraColorPicker.ValueSwatch
                  boxSize="32px"
                  flex="0 0 auto"
                  borderRadius="6px"
                  border={`1px solid ${themeTokens.border}`}
                />
                <Box flex="1" minWidth="0">
                  <Text
                    marginBottom="4px"
                    color={themeTokens.textMuted}
                    fontSize="11px"
                  >
                    HEX
                  </Text>
                  <ChakraColorPicker.Input
                    width="100%"
                    minWidth="0"
                    padding="6px 8px"
                    borderRadius="6px"
                    border={`1px solid ${themeTokens.accent}`}
                    background={themeTokens.bgSunken}
                    color={themeTokens.textPrimary}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                    fontSize="12px"
                  />
                </Box>
                {allowAlpha ? (
                  <Box width="58px" minWidth="0">
                    <Text
                      marginBottom="4px"
                      color={themeTokens.textMuted}
                      fontSize="11px"
                    >
                      Alpha
                    </Text>
                    <ChakraColorPicker.ChannelInput
                      channel="alpha"
                      width="100%"
                      minWidth="0"
                      padding="6px 8px"
                      borderRadius="6px"
                      border={`1px solid ${themeTokens.border}`}
                      background={themeTokens.bgSunken}
                      color={themeTokens.textPrimary}
                      fontSize="12px"
                    />
                  </Box>
                ) : null}
              </HStack>
            </Stack>
          </ChakraColorPicker.Content>
        </ChakraColorPicker.Positioner>
      </Portal>
    </ChakraColorPicker.Root>
  );
};

export default ColorPicker;
