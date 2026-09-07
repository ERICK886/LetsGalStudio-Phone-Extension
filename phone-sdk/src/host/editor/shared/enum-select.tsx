/**
 * @file enum-select.tsx
 * @description 枚举下拉选择器：Portal 弹出、可过滤、可清除、键盘导航。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 *
 * @remarks
 * 弹出层经 `createPortal` 挂到 `document.body`，定位与 ColorPicker 一致
 * （fixed + `COLOR_PICKER_SHELL_ATTR` 夹紧）。模块级 single-open 互斥。
 *
 * @example
 * ```tsx
 * <EnumSelect
 *   value={mode}
 *   onChange={setMode}
 *   options={[{ value: "a", label: "选项 A" }]}
 *   filterable
 *   clearable
 * />
 * ```
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useTheme, FONT_SIZE_DEFAULT } from "../theme/theme-provider";
import { COLOR_PICKER_SHELL_ATTR } from "./color-picker";
import {
  filterEnumOptions,
  mergeOrphanOption,
  resolveEnumLabel,
  type EnumSelectOption,
} from "./enum-select-utils";
import { ChakraButton, ChakraDiv, ChakraInput, ChakraSpan } from "./chakra-elements";

/** 触发器与下拉间距（px） */
const DROPDOWN_GAP = 6;

/** 相对视口 / 壳边缘的安全边距（px） */
const VIEWPORT_PAD = 8;

/** 下拉最小宽度（px） */
const MIN_DROPDOWN_WIDTH = 160;

/** 选项列表最大高度（px） */
const MAX_LIST_HEIGHT = 240;

/** accent 浅色底（hover / 键盘高亮） */
const ACCENT_TINT = "26";

/** 模块级：保证同时仅一个 EnumSelect 打开 */
let openCloser: (() => void) | null = null;

/**
 * 将数值限制在 [min, max]。
 */
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * 查找夹紧边界：编辑器壳矩形；找不到则用 visualViewport / window。
 */
function resolveClampBounds(trigger: HTMLElement): DOMRect {
  const host = trigger.closest(`[${COLOR_PICKER_SHELL_ATTR}]`);
  if (host instanceof HTMLElement) {
    return host.getBoundingClientRect();
  }
  const vv = window.visualViewport;
  if (vv) {
    return new DOMRect(vv.offsetLeft, vv.offsetTop, vv.width, vv.height);
  }
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

/**
 * 计算下拉 `position:fixed` 坐标：优先下方，不够则上方；左对齐触发器。
 */
function computeDropdownFixedPos(
  anchor: DOMRect,
  popW: number,
  popH: number,
  bounds: DOMRect,
): { top: number; left: number } {
  const leftMin = bounds.left + VIEWPORT_PAD;
  const leftMax = bounds.right - VIEWPORT_PAD - popW;
  const topMin = bounds.top + VIEWPORT_PAD;
  const topMax = bounds.bottom - VIEWPORT_PAD - popH;

  let left = anchor.left;
  left = clamp(left, leftMin, Math.max(leftMin, leftMax));

  let top = anchor.bottom + DROPDOWN_GAP;
  if (top + popH > bounds.bottom - VIEWPORT_PAD) {
    top = anchor.top - DROPDOWN_GAP - popH;
  }
  top = clamp(top, topMin, Math.max(topMin, topMax));

  return { top, left };
}

/**
 * EnumSelect 属性。
 */
export interface EnumSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly EnumSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  clearable?: boolean;
  filterable?: boolean;
  ariaLabel?: string;
}

/**
 * 枚举下拉选择器。
 */
export function EnumSelect({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "请选择",
  clearable,
  filterable,
  ariaLabel,
}: EnumSelectProps): React.ReactElement {
  const { tokens } = useTheme();
  const baseId = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>(
    { top: 0, left: 0, width: MIN_DROPDOWN_WIDTH },
  );
  const [placed, setPlaced] = useState(false);

  const merged = useMemo(
    () => mergeOrphanOption(options, value),
    [options, value],
  );
  const filtered = useMemo(
    () => (filterable ? filterEnumOptions(merged, query) : merged),
    [filterable, merged, query],
  );

  const displayLabel = resolveEnumLabel(merged, value, placeholder);
  const hasValue = value.trim() !== "";
  const listboxId = `${baseId}-listbox`;
  const comboboxId = `${baseId}-combobox`;

  const mountedRef = useRef(true);
  const instanceCloserRef = useRef<(() => void) | null>(null);
  if (instanceCloserRef.current === null) {
    instanceCloserRef.current = () => {
      if (!mountedRef.current) {
        return;
      }
      setOpen(false);
    };
  }

  const clearOpenCloserIfMine = useCallback(() => {
    if (openCloser === instanceCloserRef.current) {
      openCloser = null;
    }
  }, []);

  const closeDropdown = useCallback(() => {
    if (!mountedRef.current) {
      clearOpenCloserIfMine();
      return;
    }
    setOpen(false);
    clearOpenCloserIfMine();
  }, [clearOpenCloserIfMine]);

  const openDropdown = useCallback(() => {
    if (disabled) {
      return;
    }
    openCloser?.();
    openCloser = instanceCloserRef.current;
    setQuery("");
    const idx = merged.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : merged.length > 0 ? 0 : -1);
    setOpen(true);
  }, [disabled, merged, value]);

  const toggleOpen = useCallback(() => {
    if (open) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }, [open, closeDropdown, openDropdown]);

  const selectOption = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      closeDropdown();
    },
    [onChange, closeDropdown],
  );

  const updatePosition = useCallback(() => {
    const anchorEl = rootRef.current;
    if (!anchorEl) {
      return;
    }
    const anchor = anchorEl.getBoundingClientRect();
    const bounds = resolveClampBounds(anchorEl);
    const popEl = dropdownRef.current;
    const popH = popEl?.offsetHeight ?? 200;
    const popW = Math.max(anchor.width, MIN_DROPDOWN_WIDTH);
    const { top, left } = computeDropdownFixedPos(anchor, popW, popH, bounds);
    setPos({ top, left, width: popW });
    setPlaced(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPlaced(false);
      return;
    }

    const onReposition = () => updatePosition();
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      updatePosition();
      raf2 = window.requestAnimationFrame(() => updatePosition());
    });

    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    let ro: ResizeObserver | null = null;
    const observeTimer = window.setTimeout(() => {
      if (typeof ResizeObserver === "undefined") {
        return;
      }
      ro = new ResizeObserver(onReposition);
      if (dropdownRef.current) {
        ro.observe(dropdownRef.current);
      }
      const shell = rootRef.current?.closest(`[${COLOR_PICKER_SHELL_ATTR}]`);
      if (shell) {
        ro.observe(shell);
      }
    }, 0);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(observeTimer);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      ro?.disconnect();
    };
  }, [open, filtered.length, filterable, updatePosition]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (filterable) {
      filterInputRef.current?.focus();
    }
  }, [open, filterable]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onOutside = (e: Event) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) {
        return;
      }
      if (dropdownRef.current?.contains(t)) {
        return;
      }
      closeDropdown();
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [open, closeDropdown]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (openCloser === instanceCloserRef.current) {
        openCloser = null;
      }
    };
  }, []);

  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const moveActive = useCallback(
    (delta: number) => {
      if (filtered.length === 0) {
        setActiveIndex(-1);
        return;
      }
      setActiveIndex((prev) => {
        const start = prev < 0 ? (delta > 0 ? -1 : filtered.length) : prev;
        let next = start + delta;
        if (next < 0) {
          next = filtered.length - 1;
        } else if (next >= filtered.length) {
          next = 0;
        }
        return next;
      });
    },
    [filtered.length],
  );

  const handleListKeys = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          moveActive(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          moveActive(-1);
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < filtered.length) {
            selectOption(filtered[activeIndex].value);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown();
          triggerRef.current?.focus();
          break;
        default:
          break;
      }
    },
    [moveActive, activeIndex, filtered, selectOption, closeDropdown],
  );

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) {
      return;
    }
    if (!open) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    if (!filterable) {
      handleListKeys(e);
    }
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleListKeys(e);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange("");
  };

  const activeDescendantId =
    activeIndex >= 0 && activeIndex < filtered.length
      ? `${baseId}-option-${activeIndex}`
      : undefined;

  const dropdown =
    open && typeof document !== "undefined"
      ? createPortal(
          <ChakraDiv
            ref={dropdownRef}
            style={{
              position: "fixed",
              zIndex: 10000,
              top: pos.top,
              left: pos.left,
              width: pos.width,
              boxSizing: "border-box",
              borderRadius: 6,
              background: tokens.bgElevated,
              border: `1px solid ${tokens.border}`,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
              overflow: "hidden",
              fontSize: FONT_SIZE_DEFAULT,
              color: tokens.textPrimary,
              visibility: placed ? "visible" : "hidden",
              pointerEvents: placed ? "auto" : "none",
            }}
          >
            {filterable ? (
              <ChakraDiv
                style={{
                  padding: 6,
                  borderBottom: `1px solid ${tokens.border}`,
                }}
              >
                <ChakraInput
                  ref={filterInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    const nextQuery = e.target.value;
                    setQuery(nextQuery);
                    const nextFiltered = filterEnumOptions(merged, nextQuery);
                    setActiveIndex(nextFiltered.length > 0 ? 0 : -1);
                  }}
                  onKeyDown={handleFilterKeyDown}
                  placeholder="搜索…"
                  aria-label="筛选选项"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `1px solid ${tokens.border}`,
                    background: tokens.bgSunken,
                    color: tokens.textPrimary,
                    fontSize: FONT_SIZE_DEFAULT,
                    outline: "none",
                  }}
                />
              </ChakraDiv>
            ) : null}

            <ChakraDiv
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={comboboxId}
              style={{
                maxHeight: MAX_LIST_HEIGHT,
                overflowY: "auto",
                padding: 4,
              }}
            >
              {filtered.length === 0 ? (
                <ChakraDiv
                  role="presentation"
                  style={{
                    padding: "8px 10px",
                    color: tokens.textMuted,
                    fontSize: FONT_SIZE_DEFAULT,
                  }}
                >
                  无匹配
                </ChakraDiv>
              ) : (
                filtered.map((opt, index) => {
                  const selected = opt.value === value;
                  const active = index === activeIndex;
                  return (
                    <ChakraDiv
                      key={opt.value}
                      id={`${baseId}-option-${index}`}
                      ref={(el: HTMLDivElement | null) => {
                        optionRefs.current[index] = el;
                      }}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectOption(opt.value)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        color: tokens.textPrimary,
                        background: active
                          ? `${tokens.accent}${ACCENT_TINT}`
                          : selected
                            ? `${tokens.accent}14`
                            : "transparent",
                        border: active
                          ? `1px solid ${tokens.borderStrong}`
                          : "1px solid transparent",
                        boxSizing: "border-box",
                      }}
                    >
                      {opt.label}
                    </ChakraDiv>
                  );
                })
              )}
            </ChakraDiv>
          </ChakraDiv>,
          document.body,
        )
      : null;

  return (
    <ChakraDiv
      ref={rootRef}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        boxSizing: "border-box",
        borderRadius: 6,
        border: `1px solid ${tokens.border}`,
        background: tokens.bgSunken,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <ChakraButton
        ref={triggerRef}
        id={comboboxId}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? activeDescendantId : undefined}
        aria-label={ariaLabel}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flex: 1,
          minWidth: 0,
          boxSizing: "border-box",
          padding: "6px 8px",
          border: "none",
          borderRadius: 6,
          background: "transparent",
          color: hasValue ? tokens.textPrimary : tokens.textMuted,
          fontSize: FONT_SIZE_DEFAULT,
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
        }}
      >
        <ChakraSpan
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayLabel}
        </ChakraSpan>

        <ChakraSpan
          aria-hidden
          style={{
            flex: "0 0 auto",
            color: tokens.textMuted,
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          ▼
        </ChakraSpan>
      </ChakraButton>

      {clearable && hasValue ? (
        <ChakraButton
          type="button"
          aria-label="清除"
          disabled={disabled}
          onClick={handleClear}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            padding: 0,
            border: "none",
            borderRadius: "0 6px 6px 0",
            background: "transparent",
            color: tokens.textMuted,
            fontSize: 14,
            lineHeight: 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          ×
        </ChakraButton>
      ) : null}

      {dropdown}
    </ChakraDiv>
  );
}
