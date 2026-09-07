import React, { type CSSProperties } from "react";
import type { ExtensionProps } from "@avg-studio/sdk";

export interface PhoneHudProps extends ExtensionProps {
  visible: boolean;
  iconUrl?: string;
  position: string;
  offsetX: number;
  offsetY: number;
  size: number;
  onOpen: () => void;
}

export const PhoneHudUI: React.FC<PhoneHudProps> = ({
  visible, iconUrl, position, offsetX, offsetY, size, onOpen,
}) => {
  if (!visible) return null;
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
    width: size,
    height: size,
    top: top ? `calc(16px + env(safe-area-inset-top, 0px) + ${offsetY}px)` : middle ? `calc(50% + ${offsetY}px)` : undefined,
    bottom: bottom ? `calc(16px + env(safe-area-inset-bottom, 0px) - ${offsetY}px)` : undefined,
    left: left ? `calc(16px + env(safe-area-inset-left, 0px) + ${offsetX}px)` : center ? `calc(50% + ${offsetX}px)` : undefined,
    right: right ? `calc(16px + env(safe-area-inset-right, 0px) - ${offsetX}px)` : undefined,
    transform,
  };
  return (
    <div className="phone-hud-root">
      <style>{`
.phone-hud-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none}
.phone-hud-root .phone-hud-button{display:flex;align-items:center;justify-content:center;padding:0;border:1px solid rgba(255,255,255,.58);border-radius:28%;background:rgba(18,22,31,.82);box-shadow:0 4px 18px rgba(0,0,0,.34);color:#fff;cursor:pointer;pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;backdrop-filter:blur(8px);overflow:hidden}
.phone-hud-root .phone-hud-button:focus-visible{outline:2px solid #fff;outline-offset:2px}
.phone-hud-root .phone-hud-button img{display:block;width:100%;height:100%;object-fit:cover}
.phone-hud-root .phone-hud-button span{font-size:58%;line-height:1}
`}</style>
      <button type="button" className="phone-hud-button" style={buttonStyle} onClick={onOpen} aria-label="打开手机" title="打开手机">
        {iconUrl ? <img src={iconUrl} alt="" /> : <span aria-hidden="true">📱</span>}
      </button>
    </div>
  );
};
