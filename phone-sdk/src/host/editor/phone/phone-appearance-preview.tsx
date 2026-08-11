/**
 * @file phone-appearance-preview.tsx
 * @description 「手机」Tab 中栏：高保真静态桌面预览（复用真机 CSS，无启动交互）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import React, {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import phoneCss from "../../phone/ui/styles/phone.css?inline";
import { firstGlyph, resolveAssetUrl } from "../../phone/ui/asset-utils";
import { sanitizeBackgroundCss } from "../../phone/catalog";
import { useTheme, FONT_SIZE_DEFAULT } from "../theme/theme-provider";
import { readPhonePreviewApps } from "./phone-preview-catalog";
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

/**
 * 状态栏信号 / Wi‑Fi / 电池图标（与运行时桌面一致）。
 *
 * @returns SVG 图标组
 */
function PhoneStatusIcons(): React.ReactElement {
  return (
    <span className="phone-status-icons" aria-hidden="true">
      <svg
        className="phone-status-icon phone-signal-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 1024 1024"
        focusable="false"
      >
        <path d="M0 0h1024v1024H0z" fill="none" />
        <path
          fill="#fff"
          d="M584 352H440c-17.7 0-32 14.3-32 32v544c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V384c0-17.7-14.3-32-32-32M892 64H748c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32M276 640H132c-17.7 0-32 14.3-32 32v256c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V672c0-17.7-14.3-32-32-32"
        />
      </svg>
      <svg
        className="phone-status-icon phone-wifi-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        focusable="false"
      >
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="#fff"
          d="M10.225 20.275Q9.5 19.55 9.5 18.5t.725-1.775T12 16t1.775.725t.725 1.775t-.725 1.775T12 21t-1.775-.725m5.338-9.675q1.687.6 3.062 1.65q.5.375.513.988T18.7 14.3q-.425.425-1.05.438t-1.125-.338q-.95-.65-2.1-1.025T12 13t-2.425.375t-2.1 1.025q-.5.35-1.125.325t-1.05-.45q-.425-.45-.425-1.062t.5-.988q1.375-1.05 3.063-1.638T12 10t3.563.6m2.324-5.575q2.763 1.025 4.963 2.9q.5.425.525 1.05t-.425 1.075q-.425.425-1.05.438t-1.125-.388q-1.8-1.475-4.037-2.287T12 7t-4.737.813T3.225 10.1q-.5.4-1.125.388t-1.05-.438Q.6 9.6.625 8.975t.525-1.05q2.2-1.875 4.963-2.9T12 4t5.888 1.025"
        />
      </svg>
      <svg
        className="phone-status-icon phone-battery-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        focusable="false"
      >
        <path d="M0 0h24v24H0z" fill="none" />
        <g fill="#fff">
          <path d="M6 15a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h6v6z" />
          <path
            fillRule="evenodd"
            d="M18 6H5a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13a3 3 0 0 0 3-3a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1a3 3 0 0 0-3-3m0 2H5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1"
            clipRule="evenodd"
          />
        </g>
      </svg>
    </span>
  );
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
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
      }}
    >
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
            <header className="phone-status">
              <time>
                {clock.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <PhoneStatusIcons />
            </header>

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
