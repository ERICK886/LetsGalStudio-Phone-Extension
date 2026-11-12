/**
 * @file phone-appearance-preview.tsx
 * @description 「手机」Tab 中栏：高保真静态桌面预览（复用真机 CSS，无启动交互）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import React, {
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import phoneCss from "../../phone/ui/styles/phone.css?inline";
import { firstGlyph, resolveAssetUrl } from "../../phone/ui/asset-utils";
import { sanitizeBackgroundCss } from "../../phone/catalog";
import { useTheme, FONT_SIZE_DEFAULT } from "../theme/theme-provider";
import { readPhonePreviewApps } from "./phone-preview-catalog";
import { PhonePreviewStatusBar } from "./phone-preview-status-bar";
import previewOverrideCss from "./phone-editor-preview.css?inline";
import { computePhoneDockLayout, PHONE_DOCK_TRANSITION_MS } from "../../phone/ui/phone-dock-layout";

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
  dockPreview?: boolean;
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
  dockPreview = false,
}: PhoneAppearancePreviewProps): React.ReactElement {
  const ctx = useExtensionContext();
  const { tokens } = useTheme();
  const stylePreset =
    values.phoneStylePreset === "android" ? "android" : "apple";
  const title = (values.phoneTitle ?? "").trim() || "手机";
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [expanded, setExpanded] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const measured = size.width > 0 && size.height > 0;
  useLayoutEffect(() => {
    if (!measured) { setMotionReady(false); return; }
    let nextFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      nextFrame = window.requestAnimationFrame(() => setMotionReady(true));
    });
    return () => { window.cancelAnimationFrame(frame); window.cancelAnimationFrame(nextFrame); };
  }, [measured]);
  useLayoutEffect(() => {
    const root = viewportRef.current;
    if (!root || !dockPreview) return;
    const measure = () => setSize({ width: root.clientWidth, height: root.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [dockPreview]);
  const collapsed = dockPreview && !expanded && values.showPhoneHudButton !== "false";
  const dock = computePhoneDockLayout({
    ...size, stylePreset, openPosition: values.popupPosition || "bottom-right",
    dockPosition: values.phoneHudPosition,
    scale: values.phoneHudScale, peek: values.phoneHudPeekHeight,
    offsetX: values.phoneHudOffsetX, offsetY: values.phoneHudOffsetY,
  });

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
        position: "relative",
      }}
    >
      <div
        ref={viewportRef}
        data-phone-root="phone-editor-preview"
        data-phone-editor-preview={dockPreview ? undefined : ""}
        data-phone-dock-enabled={dockPreview ? "true" : undefined}
        data-phone-docked={collapsed ? "true" : "false"}
        data-phone-style-preset={stylePreset}
        data-phone-position={dockPreview ? values.popupPosition || "bottom-right" : "center"}
        data-phone-closing="false"
        data-phone-message-mode="false"
        data-phone-in-app="false"
        data-phone-in-app-phase="idle"
        style={{ ...rootStyle, flex: "1 1 auto", minHeight: 0, ...(dockPreview ? { position: "relative", width: "100%", background: "transparent", visibility: measured ? "visible" : "hidden" } as CSSProperties : {}) }}
      >
        <style>{phoneCss}</style>
        <style>{previewOverrideCss}</style>

        <div className={dockPreview ? "phone-viewport-fit" : undefined} style={dockPreview ? {
          width: dock.fit.width, height: dock.fit.height,
          transform: collapsed ? dock.transform : "translate3d(0, 0, 0) scale(1)",
          transitionDuration: motionReady ? `${PHONE_DOCK_TRANSITION_MS}ms` : "0ms",
        } : { display: "contents" }}>
        <div className={dockPreview ? "phone-viewport-scale" : undefined} style={dockPreview ? {
          width: dock.fit.designWidth, height: dock.fit.designHeight, transform: `scale(${dock.fit.scale})`,
        } : { display: "contents" }}>
        <section className="phone-shell" aria-label={dockPreview ? expanded ? "关闭手机" : "打开手机" : `${title}（预览）`}
          role={dockPreview ? "button" : undefined} tabIndex={dockPreview ? 0 : undefined}
          onClick={dockPreview ? () => setExpanded((value) => !value) : undefined}
          onKeyDown={dockPreview ? (event) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setExpanded((value) => !value); }
          } : undefined}
        >
          <div className="phone-screen" style={{ ...screenStyle, ...(dockPreview ? { pointerEvents: "none" } as CSSProperties : {}) }}>
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
        </div>
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
