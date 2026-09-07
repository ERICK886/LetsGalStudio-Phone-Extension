/**
 * @file asset-uri-field.tsx
 * @description 编辑器内「素材 URI / 引用」输入 + 组件内缩略图预览。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * Studio 宿主属性面板的 `item.asset()` 自带选图与预览；自定义手机编辑器
 * 此前只暴露纯文本框。本组件用 `resolveAssetUrl` 解析 URI，在输入旁（或
 * 列表行内）展示可渲染缩略图；解析失败或图片加载失败时显示占位。
 *
 * @example
 * ```tsx
 * <AssetUriField
 *   value={asset.asset}
 *   onChange={(next) => onChange({ asset: next })}
 *   placeholder="图片素材 URI"
 * />
 * ```
 */

import React, { useEffect, useMemo, useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import { resolveAssetUrl } from "../../phone/ui/asset-utils";
import { useTheme, FONT_SIZE_DEFAULT } from "../theme/theme-provider";
import type { ThemeTokens } from "../theme/tokens";
import { ChakraDiv, ChakraImage, ChakraInput } from "./chakra-elements";

/** 属性面板旁大缩略图边长（px） */
const PREVIEW_SIZE_FIELD = 56;

/** 列表行内小缩略图边长（px） */
const PREVIEW_SIZE_THUMB = 28;

/**
 * AssetUriField 属性。
 *
 * @property value       - 当前素材 URI / 引用字符串（可空）
 * @property onChange    - URI 变更回调
 * @property placeholder - 输入框占位文案
 * @property disabled    - 是否禁用输入
 * @property tokens      - 可选主题；未传则取 `useTheme().tokens`
 * @property ariaLabel   - 输入框无障碍标签
 */
export interface AssetUriFieldProps {
  value: string;
  onChange: (uri: string) => void;
  placeholder?: string;
  disabled?: boolean;
  tokens?: ThemeTokens;
  ariaLabel?: string;
}

/**
 * AssetUriThumb 属性（仅预览，无输入）。
 *
 * @property uri      - 素材 URI；空则显示空占位
 * @property size     - 边长 px；默认 28
 * @property tokens   - 可选主题
 * @property title    - 悬停提示；默认用 uri
 * @property rounded  - 圆角；默认 6
 */
export interface AssetUriThumbProps {
  uri: string | undefined;
  size?: number;
  tokens?: ThemeTokens;
  title?: string;
  rounded?: number;
}

/**
 * 仅缩略图：列表行、图标预览等不需要编辑 URI 时使用。
 *
 * @param props - 见 {@link AssetUriThumbProps}
 * @returns 方形缩略图或占位块
 *
 * @example
 * ```tsx
 * <AssetUriThumb uri={avatar.asset} size={28} />
 * ```
 */
export function AssetUriThumb({
  uri,
  size = PREVIEW_SIZE_THUMB,
  tokens: tokensProp,
  title,
  rounded = 6,
}: AssetUriThumbProps): React.ReactElement {
  const { tokens: themeTokens } = useTheme();
  const tokens = tokensProp ?? themeTokens;
  const ctx = useExtensionContext();
  const trimmed = (uri ?? "").trim();
  const url = useMemo(
    () => resolveAssetUrl(ctx, trimmed || undefined),
    [ctx, trimmed],
  );
  const [broken, setBroken] = useState(false);

  /** URI 变更后重置 broken，允许重新尝试加载 */
  useEffect(() => {
    setBroken(false);
  }, [url]);

  const box: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: rounded,
    border: `1px solid ${tokens.border}`,
    background: tokens.bgSunken,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: tokens.textMuted,
    fontSize: Math.max(9, Math.round(size * 0.28)),
    lineHeight: 1,
    userSelect: "none",
  };

  if (!trimmed) {
    return (
      <ChakraDiv style={box} title={title ?? "未填素材"} aria-hidden>
        —
      </ChakraDiv>
    );
  }

  if (!url || broken) {
    return (
      <ChakraDiv style={box} title={title ?? trimmed} aria-hidden>
        ?
      </ChakraDiv>
    );
  }

  return (
    <ChakraDiv style={box} title={title ?? trimmed}>
      <ChakraImage
        src={url}
        alt=""
        draggable={false}
        onError={() => setBroken(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </ChakraDiv>
  );
}

/**
 * 素材 URI 文本输入 + 旁路缩略图预览。
 *
 * @param props - 见 {@link AssetUriFieldProps}
 * @returns 横向布局：左预览、右输入
 *
 * @throws 不抛异常；素材解析失败时静默显示「?」占位（与运行时 resolve 策略一致）
 */
export function AssetUriField({
  value,
  onChange,
  placeholder = "图片素材 URI（可空）",
  disabled = false,
  tokens: tokensProp,
  ariaLabel = "素材 URI",
}: AssetUriFieldProps): React.ReactElement {
  const { tokens: themeTokens } = useTheme();
  const tokens = tokensProp ?? themeTokens;

  const controlStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 9px",
    borderRadius: 4,
    fontSize: FONT_SIZE_DEFAULT,
    outline: "none",
    border: `1px solid ${tokens.border}`,
    background: tokens.bgSunken,
    color: tokens.textPrimary,
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? "not-allowed" : "text",
  };

  const hint =
    value.trim() === ""
      ? "空值不预览"
      : "左侧为解析后的缩略图；无法解析或加载失败时显示「?」";

  return (
    <ChakraDiv style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <ChakraDiv
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 8,
          minWidth: 0,
        }}
      >
        <AssetUriThumb
          uri={value}
          size={PREVIEW_SIZE_FIELD}
          tokens={tokens}
          rounded={6}
        />
        <ChakraInput
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          style={{ ...controlStyle, flex: 1, minWidth: 0, alignSelf: "center" }}
        />
      </ChakraDiv>
      <ChakraDiv
        style={{
          fontSize: 10,
          color: tokens.textMuted,
          lineHeight: 1.4,
        }}
      >
        {hint}
      </ChakraDiv>
    </ChakraDiv>
  );
}

export default AssetUriField;
