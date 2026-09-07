/**
 * @file phone-preview-status-bar.tsx
 * @description 手机编辑器各 APP 预览共用的顶部状态栏。
 */

import React, { useEffect, useMemo, useState, type CSSProperties } from "react";

export type PhonePreviewStylePreset = "apple" | "android";

export interface PhonePreviewStatusBarProps {
  /** 与手机宿主一致的外观预设。 */
  stylePreset?: PhonePreviewStylePreset;
  /** 需要固定时间的快照可直接传入；默认显示当前本地时间。 */
  timeLabel?: string;
  background?: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/** 与运行时手机状态栏一致的信号、Wi-Fi 与电池图标。 */
export function PhonePreviewStatusIcons(): React.ReactElement {
  return (
    <span
      className="phone-status-icons"
      aria-hidden="true"
      style={{ display: "flex", alignItems: "center", gap: 6 }}
    >
      <svg
        className="phone-status-icon phone-signal-icon"
        width="16"
        height="16"
        viewBox="0 0 1024 1024"
        focusable="false"
        style={{ display: "block", flex: "0 0 auto" }}
      >
        <path d="M0 0h1024v1024H0z" fill="none" />
        <path
          fill="currentColor"
          d="M584 352H440c-17.7 0-32 14.3-32 32v544c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V384c0-17.7-14.3-32-32-32M892 64H748c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32M276 640H132c-17.7 0-32 14.3-32 32v256c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V672c0-17.7-14.3-32-32-32"
        />
      </svg>
      <svg
        className="phone-status-icon phone-wifi-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        focusable="false"
        style={{ display: "block", flex: "0 0 auto" }}
      >
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="currentColor"
          d="M10.225 20.275Q9.5 19.55 9.5 18.5t.725-1.775T12 16t1.775.725t.725 1.775t-.725 1.775T12 21t-1.775-.725m5.338-9.675q1.687.6 3.062 1.65q.5.375.513.988T18.7 14.3q-.425.425-1.05.438t-1.125-.338q-.95-.65-2.1-1.025T12 13t-2.425.375t-2.1 1.025q-.5.35-1.125.325t-1.05-.45q-.425-.45-.425-1.062t.5-.988q1.375-1.05 3.063-1.638T12 10t3.563.6m2.324-5.575q2.763 1.025 4.963 2.9q.5.425.525 1.05t-.425 1.075q-.425.425-1.05.438t-1.125-.388q-1.8-1.475-4.037-2.287T12 7t-4.737.813T3.225 10.1q-.5.4-1.125.388t-1.05-.438Q.6 9.6.625 8.975t.525-1.05q2.2-1.875 4.963-2.9T12 4t5.888 1.025"
        />
      </svg>
      <svg
        className="phone-status-icon phone-battery-icon"
        width="18"
        height="16"
        viewBox="0 0 24 24"
        focusable="false"
        style={{ display: "block", flex: "0 0 auto" }}
      >
        <path d="M0 0h24v24H0z" fill="none" />
        <g fill="currentColor">
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
 * 统一预览状态栏的时间、间距和图标，避免每个 APP 各自维护一份假状态栏。
 */
export function PhonePreviewStatusBar({
  stylePreset = "apple",
  timeLabel,
  background = "transparent",
  color = "inherit",
  className = "",
  style,
}: PhonePreviewStatusBarProps): React.ReactElement {
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    if (timeLabel !== undefined) return undefined;
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [timeLabel]);

  const resolvedTime = useMemo(
    () =>
      timeLabel ??
      clock.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [clock, timeLabel],
  );

  const isAndroid = stylePreset === "android";
  return (
    <header
      className={`phone-status phone-preview-status${className ? ` ${className}` : ""}`}
      style={{
        flex: "0 0 auto",
        minHeight: isAndroid ? 40 : 46,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
        padding: isAndroid ? "8px 17px 4px" : "12px 20px 6px",
        fontSize: isAndroid ? 11 : 12,
        fontWeight: 700,
        lineHeight: 1,
        background,
        color,
        ...style,
      }}
    >
      <time>{resolvedTime}</time>
      <PhonePreviewStatusIcons />
    </header>
  );
}
