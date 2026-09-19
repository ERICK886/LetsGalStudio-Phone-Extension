import React, { type CSSProperties } from "react";
import type { ExtensionProps } from "@avg-studio/sdk";
import {
  resolvePhoneHudConfig,
  type PhoneHudButtonType,
  type PhoneHudIconPreset,
  type PhoneHudStylePreset,
} from "../phone-hud-config";

export interface PhoneHudProps extends ExtensionProps {
  visible: boolean;
  buttonType?: PhoneHudButtonType | string;
  text?: string;
  iconPreset?: PhoneHudIconPreset | string;
  iconUrl?: string;
  imageUrl?: string;
  backgroundImageUrl?: string;
  stylePreset?: PhoneHudStylePreset | string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  position: string;
  offsetX: number;
  offsetY: number;
  size: number;
  width?: number;
  contentSize?: number;
  onOpen: () => void;
}

export const PhoneHudUI: React.FC<PhoneHudProps> = ({
  visible,
  buttonType,
  text,
  iconPreset,
  iconUrl,
  imageUrl,
  backgroundImageUrl,
  stylePreset,
  backgroundColor,
  textColor,
  borderColor,
  borderWidth,
  borderRadius,
  position,
  offsetX,
  offsetY,
  size,
  width,
  contentSize,
  onOpen,
}) => {
  if (!visible) return null;
  const config = resolvePhoneHudConfig({
    buttonType,
    text,
    iconPreset,
    stylePreset,
    backgroundColor,
    textColor,
    borderColor,
    borderWidth,
    borderRadius,
    size,
    width,
    contentSize,
  });
  const top = position.startsWith("top-");
  const bottom = position.startsWith("bottom-");
  const left = position.endsWith("-left");
  const right = position.endsWith("-right");
  const center = position.endsWith("-center");
  const middle = position.startsWith("middle-");
  const transform = [center ? "translateX(-50%)" : "", middle ? "translateY(-50%)" : ""]
    .filter(Boolean).join(" ") || undefined;
  const buttonStyle: CSSProperties = {
    position: "absolute",
    width: config.width > 0
      ? config.width
      : config.buttonType === "text"
        ? "auto"
        : config.height,
    minWidth: config.buttonType === "text" ? config.height : undefined,
    height: config.height,
    top: top ? `calc(16px + env(safe-area-inset-top, 0px) + ${offsetY}px)` : middle ? `calc(50% + ${offsetY}px)` : undefined,
    bottom: bottom ? `calc(16px + env(safe-area-inset-bottom, 0px) - ${offsetY}px)` : undefined,
    left: left ? `calc(16px + env(safe-area-inset-left, 0px) + ${offsetX}px)` : center ? `calc(50% + ${offsetX}px)` : undefined,
    right: right ? `calc(16px + env(safe-area-inset-right, 0px) - ${offsetX}px)` : undefined,
    transform,
    padding: config.buttonType === "text"
      ? `0 ${Math.max(10, Math.round(config.height * 0.28))}px`
      : 0,
    border: `${config.borderWidth}px solid ${config.borderColor}`,
    borderRadius: config.borderRadius,
    backgroundColor: config.backgroundColor,
    backgroundImage: backgroundImageUrl ? `url(${JSON.stringify(backgroundImageUrl)})` : undefined,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    boxShadow: config.boxShadow,
    color: config.textColor,
    backdropFilter: config.backdropBlur > 0 ? `blur(${config.backdropBlur}px)` : undefined,
  };
  const resolvedImageUrl = imageUrl || iconUrl;
  return (
    <div className="phone-hud-root">
      <style>{`
.phone-hud-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none}
.phone-hud-root .phone-hud-button{display:flex;align-items:center;justify-content:center;box-sizing:border-box;cursor:pointer;pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;overflow:hidden;white-space:nowrap}
.phone-hud-root .phone-hud-button:focus-visible{outline:2px solid #fff;outline-offset:2px}
.phone-hud-root .phone-hud-button img{display:block}
.phone-hud-root .phone-hud-button .phone-hud-fill-image{width:100%;height:100%;object-fit:cover}
.phone-hud-root .phone-hud-button .phone-hud-custom-icon{width:auto;height:auto;max-width:100%;max-height:100%;object-fit:contain}
.phone-hud-root .phone-hud-button span{line-height:1}
`}</style>
      <button
        type="button"
        className="phone-hud-button"
        data-phone-hud-type={config.buttonType}
        data-phone-hud-style={config.stylePreset}
        style={buttonStyle}
        onClick={onOpen}
        aria-label={config.buttonType === "text" ? config.text : "打开手机"}
        title="打开手机"
      >
        {config.buttonType === "text" ? (
          <span style={{ fontSize: config.contentSize, fontWeight: 600 }}>{config.text}</span>
        ) : config.buttonType === "image" ? (
          resolvedImageUrl ? <img className="phone-hud-fill-image" src={resolvedImageUrl} alt="" /> : (
            <span aria-hidden="true" style={{ fontSize: config.contentSize }}>{config.iconGlyph}</span>
          )
        ) : iconUrl ? (
          <img
            className="phone-hud-custom-icon"
            src={iconUrl}
            alt=""
            style={{ width: config.contentSize, height: config.contentSize }}
          />
        ) : (
          <span aria-hidden="true" style={{ fontSize: config.contentSize }}>{config.iconGlyph}</span>
        )}
      </button>
    </div>
  );
};
