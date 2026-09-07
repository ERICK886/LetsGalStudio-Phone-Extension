/**
 * @file fa-icon.tsx
 * @description Font Awesome 图标组件与「图标+文案」组合（默认 solid）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * 用法对齐场景交互 `fa-icon.tsx`：首次渲染时 `ensureFontAwesomeCss()`。
 */

import React from "react";

import {
  ensureFontAwesomeCss,
  normalizeFaIconName,
} from "./font-awesome";
import { ChakraIcon, ChakraSpan } from "./chakra-elements";

/** 图标样式族 */
export type FaIconStyle = "solid" | "regular" | "brands";

/**
 * FaIcon 属性。
 */
export interface FaIconProps {
  /**
   * 图标名（不含 `fa-`），如 `xmark`、`mobile-screen`。
   */
  name: string;

  /** @default "solid" */
  style?: FaIconStyle;

  /** 额外 class */
  className?: string;

  /** 行内样式 */
  css?: React.CSSProperties;

  /** 无障碍标题；缺省 aria-hidden */
  title?: string;
}

const STYLE_CLASS: Record<FaIconStyle, string> = {
  solid: "fa-solid",
  regular: "fa-regular",
  brands: "fa-brands",
};

/**
 * 渲染单个 Font Awesome 图标。
 *
 * @param props - FaIconProps
 * @returns `<i>` 图标；非法 name 时 null
 *
 * @example
 * ```tsx
 * <FaIcon name="mobile-screen" />
 * <FaIcon name="comments" style="regular" />
 * ```
 */
export function FaIcon({
  name,
  style = "solid",
  className,
  css,
  title,
}: FaIconProps): React.ReactElement | null {
  ensureFontAwesomeCss();

  const icon = normalizeFaIconName(name);

  if (icon.length === 0) {
    return null;
  }

  const classes = [STYLE_CLASS[style], `fa-${icon}`];

  if (className && className.trim().length > 0) {
    classes.push(className.trim());
  }

  return (
    <ChakraIcon
      className={classes.join(" ")}
      style={css}
      title={title}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    />
  );
}

/**
 * 图标 + 可选文案（用于工具栏 / Tab 按钮）。
 */
export interface IconLabelProps {
  /** FA 图标名（不含 fa-） */
  icon: string;

  /** 文案；仅图标时省略 */
  children?: React.ReactNode;

  /** 图标字号，默认 12 */
  iconSize?: number;
}

/**
 * 图标与文案并排片段。
 *
 * @param props - IconLabelProps
 * @returns React 片段
 *
 * @example
 * ```tsx
 * <button type="button"><IconLabel icon="play">运行预览</IconLabel></button>
 * ```
 */
export function IconLabel({
  icon,
  children,
  iconSize = 12,
}: IconLabelProps): React.ReactElement {
  return (
    <>
      <FaIcon name={icon} css={{ fontSize: iconSize, lineHeight: 1 }} />
      {children !== undefined && children !== null && children !== "" ? (
        <ChakraSpan>{children}</ChakraSpan>
      ) : null}
    </>
  );
}
