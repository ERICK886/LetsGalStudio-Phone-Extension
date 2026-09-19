/**
 * @file phone-appearance-preview.tsx
 * @description 「手机」Tab 中栏：高保真静态桌面预览（复用真机 CSS，无启动交互）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import React, {
  useMemo,
  type CSSProperties,
} from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import phoneCss from "../../phone/ui/styles/phone.css?inline";
import { firstGlyph, resolveAssetUrl } from "../../phone/ui/asset-utils";
import { sanitizeBackgroundCss } from "../../phone/catalog";
import { resolvePhoneHudConfig } from "../../phone/phone-hud-config";
import { useTheme, FONT_SIZE_DEFAULT } from "../theme/theme-provider";
import { readPhonePreviewApps } from "./phone-preview-catalog";
import { PhonePreviewStatusBar } from "./phone-preview-status-bar";
import previewOverrideCss from "./phone-editor-preview.css?inline";

/**
 * PhoneAppearancePreview 属性。
 */
export interface PhoneAppearancePreviewProps {
  /** 当前外观字段值（schema contentItem id → string）。 */
  values: Record<string, string>;
  /**
   * 外部刷新令牌（如 catalogApps 变更）；变化时重读桌面应用。
   */
  refreshToken?: number | string;
}

/**
 * 弹出位置中文标签。
 *
 * @param value - popupPosition 枚举值
 * @returns 展示文案
 */
function popupLabel(value: string): string {
  const map: Record<string, string> = {
    "top-left": "左上",
    "top-center": "中上",
    "top-right": "右上",
    "bottom-left": "左下",
    "bottom-center": "中下",
    "bottom-right": "右下",
    center: "中部",
  };
  return map[value] ?? value;
}

function previewNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

/**
 * 中栏高保真静态桌面预览。
 *
 * @param props - PhoneAppearancePreviewProps
 * @returns 嵌入编辑器的真机桌面预览
 *
 * @example
 * ```tsx
 * <PhoneAppearancePreview values={readPhoneAppearanceValues(ctx)} />
 * ```
 */
export function PhoneAppearancePreview({
  values,
  refreshToken = 0,
}: PhoneAppearancePreviewProps): React.ReactElement {
  const ctx = useExtensionContext();
  const { tokens } = useTheme();
  const stylePreset =
    values.phoneStylePreset === "android" ? "android" : "apple";
  const title = (values.phoneTitle ?? "").trim() || "手机";

  const apps = useMemo(
    () => readPhonePreviewApps(ctx),
    [ctx, values, refreshToken],
  );

  const wallpaperUrl = useMemo(
    () => resolveAssetUrl(ctx, values.backgroundImage || undefined),
    [ctx, values.backgroundImage],
  );

  const backgroundCss = sanitizeBackgroundCss(values.backgroundCss);
  const hudVisible = values.showPhoneHudButton !== "false";
  const hudIconUrl = useMemo(
    () => resolveAssetUrl(ctx, values.phoneHudIcon || undefined),
    [ctx, values.phoneHudIcon],
  );
  const hudImageUrl = useMemo(
    () => resolveAssetUrl(ctx, values.phoneHudImage || undefined),
    [ctx, values.phoneHudImage],
  );
  const hudBackgroundImageUrl = useMemo(
    () => resolveAssetUrl(ctx, values.phoneHudBackgroundImage || undefined),
    [ctx, values.phoneHudBackgroundImage],
  );
  const hudConfig = resolvePhoneHudConfig({
    buttonType: values.phoneHudButtonType,
    text: values.phoneHudText,
    iconPreset: values.phoneHudIconPreset,
    stylePreset: values.phoneHudStylePreset,
    backgroundColor: values.phoneHudBackgroundColor,
    textColor: values.phoneHudTextColor,
    borderColor: values.phoneHudBorderColor,
    borderWidth: values.phoneHudBorderWidth,
    borderRadius: values.phoneHudBorderRadius,
    size: values.phoneHudSize,
    width: values.phoneHudWidth,
    contentSize: values.phoneHudContentSize,
  });
  const hudPosition = values.phoneHudPosition || "bottom-right";
  const hudOffsetX = previewNumber(values.phoneHudOffsetX, 0, -1000, 1000);
  const hudOffsetY = previewNumber(values.phoneHudOffsetY, 0, -1000, 1000);
  const hudTop = hudPosition.startsWith("top-");
  const hudBottom = hudPosition.startsWith("bottom-");
  const hudLeft = hudPosition.endsWith("-left");
  const hudRight = hudPosition.endsWith("-right");
  const hudCenter = hudPosition.endsWith("-center");
  const hudMiddle = hudPosition.startsWith("middle-");
  const hudTransform = [
    hudCenter ? "translateX(-50%)" : "",
    hudMiddle ? "translateY(-50%)" : "",
  ].filter(Boolean).join(" ") || undefined;

  const screenStyle: CSSProperties = useMemo(() => {
    const color = values.backgroundColor || "#172036";
    if (backgroundCss) {
      return { background: backgroundCss };
    }
    if (wallpaperUrl) {
      return {
        backgroundColor: color,
        backgroundImage: `linear-gradient(rgba(4, 8, 16, .08), rgba(4, 8, 16, .24)), url(${JSON.stringify(wallpaperUrl)})`,
      };
    }
    return { background: color };
  }, [backgroundCss, wallpaperUrl, values.backgroundColor]);

  const rootStyle = {
    "--phone-accent": values.accentColor || "#79c7ff",
    "--phone-shell": values.shellColor || "#11151f",
  } as CSSProperties;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: tokens.bgSunken,
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {hudVisible ? (
        <button
          type="button"
          aria-label="手机 HUD 按钮预览"
          tabIndex={-1}
          style={{
            position: "absolute",
            zIndex: 20,
            width: hudConfig.width > 0
              ? hudConfig.width
              : hudConfig.buttonType === "text"
                ? "auto"
                : hudConfig.height,
            minWidth: hudConfig.buttonType === "text" ? hudConfig.height : undefined,
            height: hudConfig.height,
            top: hudTop ? 16 + hudOffsetY : hudMiddle ? `calc(50% + ${hudOffsetY}px)` : undefined,
            bottom: hudBottom ? 16 - hudOffsetY : undefined,
            left: hudLeft ? 16 + hudOffsetX : hudCenter ? `calc(50% + ${hudOffsetX}px)` : undefined,
            right: hudRight ? 16 - hudOffsetX : undefined,
            transform: hudTransform,
            padding: hudConfig.buttonType === "text"
              ? `0 ${Math.max(10, Math.round(hudConfig.height * 0.28))}px`
              : 0,
            border: `${hudConfig.borderWidth}px solid ${hudConfig.borderColor}`,
            borderRadius: hudConfig.borderRadius,
            backgroundColor: hudConfig.backgroundColor,
            backgroundImage: hudBackgroundImageUrl
              ? `url(${JSON.stringify(hudBackgroundImageUrl)})`
              : undefined,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            boxShadow: hudConfig.boxShadow,
            color: hudConfig.textColor,
            backdropFilter: hudConfig.backdropBlur > 0 ? `blur(${hudConfig.backdropBlur}px)` : undefined,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            overflow: "hidden",
            whiteSpace: "nowrap",
            boxSizing: "border-box",
          }}
        >
          {hudConfig.buttonType === "text" ? (
            <span style={{ fontSize: hudConfig.contentSize, fontWeight: 600, lineHeight: 1 }}>
              {hudConfig.text}
            </span>
          ) : hudConfig.buttonType === "image" ? (
            hudImageUrl || hudIconUrl ? (
              <img
                src={hudImageUrl || hudIconUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span aria-hidden="true" style={{ fontSize: hudConfig.contentSize, lineHeight: 1 }}>
                {hudConfig.iconGlyph}
              </span>
            )
          ) : hudIconUrl ? (
            <img
              src={hudIconUrl}
              alt=""
              style={{ width: hudConfig.contentSize, height: hudConfig.contentSize, objectFit: "contain" }}
            />
          ) : (
            <span aria-hidden="true" style={{ fontSize: hudConfig.contentSize, lineHeight: 1 }}>
              {hudConfig.iconGlyph}
            </span>
          )}
        </button>
      ) : null}
      <div
        data-phone-root="phone-editor-preview"
        data-phone-editor-preview=""
        data-phone-style-preset={stylePreset}
        data-phone-position="center"
        data-phone-closing="false"
        data-phone-message-mode="false"
        data-phone-in-app="false"
        data-phone-in-app-phase="idle"
        style={{ ...rootStyle, flex: "1 1 auto", minHeight: 0 }}
      >
        <style>{phoneCss}</style>
        <style>{previewOverrideCss}</style>

        <section className="phone-shell" aria-label={`${title}（预览）`}>
          <div className="phone-screen" style={screenStyle}>
            <PhonePreviewStatusBar stylePreset={stylePreset} />

            <div className="phone-toolbar">
              <h1 className="phone-title">{title}</h1>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="phone-round-button"
                  aria-label="个性化手机（预览不可用）"
                  tabIndex={-1}
                >
                  ⚙
                </button>
                <button
                  type="button"
                  className="phone-round-button"
                  aria-label="关闭手机（预览不可用）"
                  tabIndex={-1}
                >
                  ×
                </button>
              </div>
            </div>

            <main className="phone-app-grid" aria-label="应用列表（预览）">
              {apps.length === 0 ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    padding: 16,
                    textAlign: "center",
                    opacity: 0.75,
                    fontSize: 12,
                  }}
                >
                  暂无桌面应用
                </div>
              ) : (
                apps.map((app) => {
                  const iconUrl = resolveAssetUrl(ctx, app.iconSource);
                  return (
                    <button
                      key={app.id}
                      type="button"
                      className="phone-app"
                      data-disabled={!app.enabled}
                      tabIndex={-1}
                      aria-disabled={!app.enabled}
                      aria-label={app.displayName}
                    >
                      <span className="phone-app-icon-wrap">
                        <span className="phone-app-icon" aria-hidden="true">
                          {iconUrl ? (
                            <img src={iconUrl} alt="" />
                          ) : (
                            firstGlyph(app.displayName)
                          )}
                        </span>
                      </span>
                      <span className="phone-app-name">{app.displayName}</span>
                    </button>
                  );
                })
              )}
            </main>

            <button
              type="button"
              className="phone-home-button"
              aria-label="返回桌面（预览）"
              tabIndex={-1}
            >
              <span className="phone-home-indicator" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>

      <div
        style={{
          flex: "0 0 auto",
          padding: "6px 10px 10px",
          fontSize: FONT_SIZE_DEFAULT,
          color: tokens.textMuted,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        静态预览 · 弹出：{popupLabel(values.popupPosition)} · 快捷键：
        {values.openPhoneShortcut || "—"}
      </div>
    </div>
  );
}

export default PhoneAppearancePreview;
