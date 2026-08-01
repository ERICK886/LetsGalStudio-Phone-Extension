import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ExtensionProps } from "@avg-studio/sdk";
import type { ToastListener, ToastNotification } from "../core/toast-runtime";
import toastCss from "../styles/toast.css?inline";
import { getPhoneHostExtensionId } from "../../host-extension-id";

export const PHONE_TOAST_POSITIONS = ["top-left", "top-center", "top-right", "middle-left", "center", "middle-right", "bottom-left", "bottom-center", "bottom-right"] as const;
export type PhoneToastPosition = (typeof PHONE_TOAST_POSITIONS)[number];
export const PHONE_TOAST_ANIMATIONS_IN = [
  "fade-in",
  "scale-in",
  "slide-in",
  "bounce-in",
] as const;
export type PhoneToastAnimationIn = (typeof PHONE_TOAST_ANIMATIONS_IN)[number];
export const PHONE_TOAST_ANIMATIONS_OUT = [
  "fade-out",
  "scale-out",
  "slide-out",
  "bounce-out",
] as const;
export type PhoneToastAnimationOut = (typeof PHONE_TOAST_ANIMATIONS_OUT)[number];
export const PHONE_TOAST_STACK_DIRECTIONS = ["above", "below"] as const;
export type PhoneToastStackDirection = (typeof PHONE_TOAST_STACK_DIRECTIONS)[number];

export interface PhoneToastData {
  message: string;
  position: PhoneToastPosition;
  animation: PhoneToastAnimationIn;
  exitAnimation: PhoneToastAnimationOut;
  stackDirection: PhoneToastStackDirection;
}

export interface PhoneToastProps extends ExtensionProps {
  subscribeToasts: (listener: ToastListener) => () => void;
  closeToastUi: () => void;
}

function groupToasts(items: readonly ToastNotification[]) {
  const groups = new Map<PhoneToastPosition, ToastNotification[]>();
  for (const item of items) {
    const group = groups.get(item.position) ?? [];
    if (item.stackDirection === "above") group.unshift(item);
    else group.push(item);
    groups.set(item.position, group);
  }
  return groups;
}

export const PhoneToastUI: React.FC<PhoneToastProps> = ({ subscribeToasts, closeToastUi }) => {
  const [items, setItems] = useState<readonly ToastNotification[]>([]);
  const hadItems = useRef(false);
  useEffect(() => subscribeToasts(setItems), [subscribeToasts]);
  useEffect(() => { if (items.length) hadItems.current = true; else if (hadItems.current) closeToastUi(); }, [items, closeToastUi]);
  const groups = useMemo(() => groupToasts(items), [items]);
  return <div data-phone-toast-root={getPhoneHostExtensionId()}><style>{toastCss}</style>{[...groups].map(([position, toasts]) => <div className="phone-toast-stack" data-position={position} key={position}>{toasts.map((toast) => <div className="phone-toast-bubble" data-animation={toast.animation} data-exit-animation={toast.exitAnimation} data-exiting={toast.exiting === true} key={toast.id} role="status" aria-live="polite"><span className="phone-toast-icon" aria-hidden="true">✓</span><span>{toast.message}</span></div>)}</div>)}</div>;
};