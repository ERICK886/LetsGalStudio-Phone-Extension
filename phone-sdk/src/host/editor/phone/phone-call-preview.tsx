import React from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import { useTheme } from "../theme/theme-provider";
import { readPhoneAppearanceValues } from "./phone-settings-bridge";
import { PhonePreviewStatusBar } from "./phone-preview-status-bar";

export interface PhoneCallPreviewProps {
  values: Record<string, string>;
  pageId: string;
  refreshToken?: number;
}

type PreviewTab = "keypad" | "records" | "contacts";

const phoneIcon = (
  <svg width="25" height="25" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M6.62 10.79a15.5 15.5 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02z"
    />
  </svg>
);

/** 电话预览底栏图标，与运行时电话 APP 的三个 Tab 一一对应。 */
function PhoneCallPreviewTabIcon({ tab }: { tab: PreviewTab }): React.ReactElement {
  const svgProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    focusable: "false" as const,
    "aria-hidden": true,
  };

  if (tab === "keypad") {
    return (
      <svg {...svgProps}>
        <g fill="currentColor">
          {[5, 12, 19].flatMap((y) =>
            [5, 12, 19].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" />
            )),
          )}
        </g>
      </svg>
    );
  }

  if (tab === "contacts") {
    return (
      <svg {...svgProps}>
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="currentColor"
          d="M19 2H5c-.55 0-1 .45-1 1v4H2v2h2v2H2v2h2v2H2v2h2v4c0 .55.45 1 1 1h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 18H6V4h13z"
        />
        <path
          fill="currentColor"
          d="M15.87 16.5 17 14.87l-2.45-1.64-1.21 1.31s-1.14-.58-1.97-1.41-1.4-1.97-1.4-1.97l1.3-1.21L9.63 7.5 8 8.63c0 .07-.16 3.21 2.25 5.62 2.4 2.4 5.54 2.25 5.62 2.25"
        />
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <path
        fill="currentColor"
        d="M15.2 14.3c-2.4-1.2-4.3-3.1-5.5-5.5l1.7-1.7L8.7 3 4 6.2C4 12.8 11.2 20 17.8 20l3.2-4.7-4.1-2.7z"
      />
      <path fill="currentColor" d="M17 2v4h-4v2h4v4h2V8h4V6h-4V2z" />
    </svg>
  );
}

function value(values: Record<string, string>, key: string, fallback: string): string {
  return values[key]?.trim() || fallback;
}

export function PhoneCallPreview({
  values,
  pageId,
  refreshToken,
}: PhoneCallPreviewProps): React.ReactElement {
  const ctx = useExtensionContext();
  const { tokens } = useTheme();
  void refreshToken;

  const phoneValues = readPhoneAppearanceValues(ctx);
  const stylePreset = phoneValues.phoneStylePreset === "android" ? "android" : "apple";
  const shellColor = phoneValues.shellColor || "#17191d";
  const bg = value(values, "styleBg", "#f5f5f7");
  const surface = value(values, "styleSurface", "#fff");
  const textColor = value(values, "styleText", "#17171a");
  const muted = value(values, "styleMuted", "#85858b");
  const accent = value(values, "styleAccent", "#1677ff");
  const incoming = pageId === "call-incoming";
  const tab: PreviewTab =
    pageId === "call-lists" ? "contacts" : pageId === "call-keypad" ? "keypad" : "records";

  const shell: React.CSSProperties = {
    width: stylePreset === "android" ? 400 : 390,
    height: stylePreset === "android" ? 760 : 780,
    flex: "0 0 auto",
    borderRadius: stylePreset === "android" ? 29 : 42,
    overflow: "hidden",
    boxShadow: "0 18px 48px rgba(0,0,0,.35)",
    border: `${stylePreset === "android" ? 7 : 9}px solid ${shellColor}`,
    boxSizing: "border-box",
    position: "relative",
    background: bg,
    color: textColor,
    fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: tokens.bgSunken,
        overflow: "auto",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div style={shell} data-testid="phone-call-editor-preview">
        {incoming ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "72px 22px 34px",
              boxSizing: "border-box",
              color: "white",
              background: `radial-gradient(circle at 50% 15%, color-mix(in srgb, ${value(values, "styleIncomingBg", "#17212c")}, white 24%), ${value(values, "styleIncomingBg", "#17212c")} 70%)`,
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 30,
                fontWeight: 700,
                background: "#8c9aaa",
              }}
            >
              林
            </div>
            <strong style={{ fontSize: 24, marginTop: 18 }}>
              {value(values, "incomingLabel", "来电")}
            </strong>
            <span style={{ fontSize: 13, opacity: 0.78, marginTop: 7 }}>
              {value(values, "incomingHint", "正在呼叫…")}
            </span>
            <div
              style={{
                marginTop: "auto",
                width: "100%",
                display: "flex",
                justifyContent: "space-around",
              }}
            >
              <div style={{ textAlign: "center", fontSize: 12 }}>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: value(values, "styleDecline", "#e23f4e"),
                    marginBottom: 7,
                  }}
                >
                  {phoneIcon}
                </div>
                {value(values, "declineLabel", "挂断")}
              </div>
              <div style={{ textAlign: "center", fontSize: 12 }}>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: value(values, "styleAnswer", "#26be5c"),
                    marginBottom: 7,
                  }}
                >
                  {phoneIcon}
                </div>
                {value(values, "answerLabel", "接听")}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <PhonePreviewStatusBar
              stylePreset={stylePreset}
              background={surface}
              color={textColor}
              style={{ textShadow: "none" }}
            />
            <div
              style={{
                height: 48,
                flex: "0 0 auto",
                position: "relative",
                display: "grid",
                placeItems: "center",
                background: surface,
                borderBottom: "1px solid rgba(0,0,0,.08)",
                fontWeight: 600,
              }}
            >
              <span style={{ position: "absolute", left: 12, fontSize: 20 }}>‹</span>
              {value(values, "appTitle", "电话")}
            </div>
            <div
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                overflow: "hidden",
                padding: 18,
                boxSizing: "border-box",
                textAlign: "center",
              }}
            >
              {tab === "keypad" ? (
                <>
                  <div style={{ fontSize: 27, height: 52 }}>
                    {value(values, "dialingLabel", "拨号")}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,68px)",
                      justifyContent: "center",
                      gap: "12px 18px",
                    }}
                  >
                    {"123456789*0#".split("").map((key) => (
                      <div
                        key={key}
                        style={{
                          width: 68,
                          height: 68,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 22,
                          background: "#e4e4e8",
                        }}
                      >
                        {key}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      margin: "18px auto 0",
                      background: value(values, "styleAnswer", "#26be5c"),
                      color: "white",
                    }}
                  >
                    {phoneIcon}
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 180, color: muted }}>
                  {tab === "contacts"
                    ? value(values, "emptyContactsHint", "暂无联系人")
                    : value(values, "emptyRecentHint", "暂无通话记录")}
                </div>
              )}
            </div>
            <div
              style={{
                height: 60,
                flex: "0 0 auto",
                display: "flex",
                background: surface,
                borderTop: "1px solid rgba(0,0,0,.1)",
              }}
            >
              {(
                [
                  ["keypad", "keypadTabLabel", "拨号键盘"],
                  ["records", "recentTabLabel", "最近通话"],
                  ["contacts", "contactsTabLabel", "通讯录"],
                ] as const
              ).map(([id, key, label]) => (
                <div
                  key={id}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    fontSize: 10,
                    color: tab === id ? accent : muted,
                  }}
                >
                  <PhoneCallPreviewTabIcon tab={id} />
                  <span>{value(values, key, label)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
