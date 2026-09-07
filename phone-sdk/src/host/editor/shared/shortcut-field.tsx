/**
 * @file shortcut-field.tsx
 * @description 快捷键录入控件（对齐 Studio 设置面板：kbd 芯片 + 捕获 + 清除）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * 输出字符串格式与 SDK `shortcut` 一致，例如 `ArrowUp`、`Ctrl+KeyP`。
 * 主键使用 `KeyboardEvent.code`；修饰键合并为 Ctrl / Shift / Alt / Meta。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTheme, FONT_SIZE_DEFAULT } from "../theme/theme-provider";
import type { ThemeTokens } from "../theme/tokens";
import {
  shortcutFromKeyboardEvent,
  shortcutToChips,
} from "./shortcut-utils";
import { ChakraButton, ChakraDiv, ChakraSpan } from "./chakra-elements";

export {
  displayKeyLabel,
  shortcutFromKeyboardEvent,
  shortcutToChips,
} from "./shortcut-utils";

/**
 * ShortcutField 属性。
 */
export interface ShortcutFieldProps {
  /** 当前快捷键字符串（如 ArrowUp）。 */
  value: string;
  /**
   * 变更回调。
   *
   * @param next - 规范化快捷键；清空时为空串
   */
  onChange: (next: string) => void;
  /** 可选标签。 */
  label?: string;
  /** 禁用。 */
  disabled?: boolean;
  /** 空态提示。 */
  placeholder?: string;
  /** 可选主题 token。 */
  tokens?: ThemeTokens;
  /** 无障碍标签。 */
  ariaLabel?: string;
}

/**
 * 快捷键字段：点击后监听下一次按键组合，右侧可清除。
 *
 * @param props - ShortcutFieldProps
 * @returns 控件
 *
 * @example
 * ```tsx
 * <ShortcutField value="ArrowUp" onChange={setShortcut} />
 * ```
 */
export function ShortcutField({
  value,
  onChange,
  label,
  disabled = false,
  placeholder = "点击后按下快捷键",
  tokens: tokensProp,
  ariaLabel,
}: ShortcutFieldProps): React.ReactElement {
  const { tokens: themeTokens } = useTheme();
  const tokens = tokensProp ?? themeTokens;
  const [listening, setListening] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const chips = useMemo(() => shortcutToChips(value), [value]);

  const stopListening = useCallback(() => {
    setListening(false);
  }, []);

  useEffect(() => {
    if (!listening || disabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Escape 取消捕获，不改值
      if (event.code === "Escape" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        stopListening();
        return;
      }

      const next = shortcutFromKeyboardEvent(event);
      if (!next) return;

      onChange(next);
      stopListening();
    };

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      stopListening();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onMouseDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onMouseDown, true);
    };
  }, [listening, disabled, onChange, stopListening]);

  const kbdStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 22,
    height: 22,
    padding: "0 6px",
    borderRadius: 4,
    background: tokens.borderStrong,
    color: tokens.textPrimary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1,
    boxShadow: `inset 0 -1px 0 rgba(0,0,0,.25)`,
  };

  return (
    <ChakraDiv
      ref={rootRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: FONT_SIZE_DEFAULT,
      }}
    >
      {label ? (
        <ChakraSpan style={{ color: tokens.textMuted, fontWeight: 500 }}>{label}</ChakraSpan>
      ) : null}

      <ChakraDiv style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ChakraButton
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? label ?? "录入快捷键"}
          aria-pressed={listening}
          onClick={() => {
            if (disabled) return;
            setListening((v) => !v);
          }}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 34,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${listening ? tokens.accent : tokens.border}`,
            background: tokens.bgSunken,
            color: tokens.textPrimary,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            boxShadow: listening ? `0 0 0 1px ${tokens.accent}55` : "none",
          }}
        >
          {chips.length > 0 ? (
            chips.map((chip, index) => (
              <ChakraSpan key={`${chip}-${index}`} style={kbdStyle}>
                {chip}
              </ChakraSpan>
            ))
          ) : (
            <ChakraSpan style={{ color: tokens.textMuted, fontSize: 12 }}>
              {listening ? "请按下快捷键…" : placeholder}
            </ChakraSpan>
          )}
        </ChakraButton>

        <ChakraButton
          type="button"
          disabled={disabled || !value.trim()}
          aria-label="清除快捷键"
          title="清除"
          onClick={() => {
            if (disabled) return;
            onChange("");
            stopListening();
          }}
          style={{
            width: 28,
            height: 28,
            flex: "0 0 auto",
            borderRadius: 4,
            border: `1px solid ${tokens.border}`,
            background: "transparent",
            color: tokens.textMuted,
            cursor: disabled || !value.trim() ? "not-allowed" : "pointer",
            opacity: !value.trim() ? 0.4 : 1,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ×
        </ChakraButton>
      </ChakraDiv>

      {listening ? (
        <ChakraDiv style={{ fontSize: 11, color: tokens.textMuted }}>
          正在监听按键；Esc 取消
        </ChakraDiv>
      ) : null}
    </ChakraDiv>
  );
}

export default ShortcutField;
