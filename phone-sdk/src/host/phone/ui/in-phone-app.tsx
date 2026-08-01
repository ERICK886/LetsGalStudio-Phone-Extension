/**
 * @file in-phone-app.tsx
 * @description Phone SDK 内页宿主渲染与调试探测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */

import React, { useEffect, useMemo } from "react";
import {
  createDebugPhoneAppRenderProps,
  phoneSdkDebug,
  type PhoneAppRegistration,
  type PhoneSafeAreaInsets,
} from "@ink-zenly/phone-sdk/plugin";
import { getPhoneHostExtensionId } from "../../host-extension-id";

/**
 * 渲染 Phone SDK 已注册应用；注册在打开后丢失时给出可回桌面的占位。
 *
 * @param props.phoneAppId 当前应用 id
 * @param props.registration 注册对象；可能为 `undefined`
 * @param props.onGoHome 回桌面
 * @param props.onClosePhone 关手机
 * @param props.safeAreaInsets 刘海/状态栏与底部 Home 安全区（CSS 像素）
 */
export function InPhoneAppContent(props: {
  phoneAppId: string;
  registration: PhoneAppRegistration | undefined;
  onGoHome: () => void;
  onClosePhone: () => void;
  safeAreaInsets: PhoneSafeAreaInsets;
}): React.ReactElement {
  const { phoneAppId, registration, onGoHome, onClosePhone, safeAreaInsets } = props;
  if (!registration) {
    return (
      <div className="phone-in-app-error" role="alert">
        <h2>应用不可用</h2>
        <p>应用「{phoneAppId}」未注册或已被注销。</p>
        <button type="button" className="phone-round-button" onClick={onGoHome}>
          返回桌面
        </button>
      </div>
    );
  }

  return (
    <InPhoneAppContentReady
      phoneAppId={phoneAppId}
      registration={registration}
      onGoHome={onGoHome}
      onClosePhone={onClosePhone}
      safeAreaInsets={safeAreaInsets}
    />
  );
}

/**
 * 已确认有注册对象时渲染内页，并挂调试：检测是否读取安全区等 SDK props。
 *
 * @param props 同 {@link InPhoneAppContent}，且 `registration` 必填
 */
export function InPhoneAppContentReady(props: {
  phoneAppId: string;
  registration: PhoneAppRegistration;
  onGoHome: () => void;
  onClosePhone: () => void;
  safeAreaInsets: PhoneSafeAreaInsets;
}): React.ReactElement {
  const { phoneAppId, registration, onGoHome, onClosePhone, safeAreaInsets } = props;

  const hostStyle = useMemo(
    () =>
      ({
        ["--phone-safe-top" as string]: `${safeAreaInsets.top}px`,
        ["--phone-safe-right" as string]: `${safeAreaInsets.right}px`,
        ["--phone-safe-bottom" as string]: `${safeAreaInsets.bottom}px`,
        ["--phone-safe-left" as string]: `${safeAreaInsets.left}px`,
        ["--phone-safe-top-fallback" as string]: "52px",
        ["--phone-safe-bottom-fallback" as string]: "40px",
      }) as React.CSSProperties,
    [safeAreaInsets],
  );

  /**
   * 每次安全区或应用变化时重建 Proxy，重新统计「是否读取了 top/bottom」。
   */
  const debugBundle = useMemo(
    () =>
      createDebugPhoneAppRenderProps({
        appId: phoneAppId,
        closeApp: onGoHome,
        closePhone: onClosePhone,
        safeAreaInsets,
      }),
    [phoneAppId, onGoHome, onClosePhone, safeAreaInsets],
  );

  const rendered = registration.render(debugBundle.props);

  useEffect(() => {
    phoneSdkDebug("宿主调用 registration.render", {
      phoneAppId,
      title: registration.title,
      safeAreaInsets,
      cssVars: {
        "--phone-safe-top": `${safeAreaInsets.top}px`,
        "--phone-safe-bottom": `${safeAreaInsets.bottom}px`,
      },
    });

    const flush = () => {
      const report = debugBundle.flushReport();
      const root = document.querySelector<HTMLElement>(
        `[data-phone-root="${getPhoneHostExtensionId()}"] .phone-in-app-host`,
      );
      const snakeRoot = root?.querySelector<HTMLElement>("[data-snake-build]");
      phoneSdkDebug("内页 DOM 探测", {
        phoneAppId,
        hostChildCount: root?.childElementCount ?? 0,
        snakeBuild: snakeRoot?.dataset.snakeBuild ?? null,
        snakeSafeTopAttr: snakeRoot?.dataset.snakeSafeTop ?? null,
        usedSafeAreaInsetValues: report.usedSafeAreaInsetValues,
        accessedInsetFields: report.accessedInsetFields,
        hint:
          snakeRoot?.dataset.snakeBuild
            ? "已挂载带 data-snake-build 的节点（当前贪吃蛇包）"
            : "未找到 data-snake-build：Studio 可能未加载最新贪吃蛇 dist，或 render 未挂载 SnakeApp",
      });
    };

    // queueMicrotask 在 Window 类型中始终存在，直接调度即可，无需 feature-detect。
    window.queueMicrotask(flush);

    const raf1 = window.requestAnimationFrame(() => {
      flush();
      window.requestAnimationFrame(flush);
    });

    const late = window.setTimeout(flush, 120);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.clearTimeout(late);
    };
  }, [debugBundle, phoneAppId, registration.title, safeAreaInsets]);

  return (
    <div className="phone-in-app-host" style={hostStyle}>
      {rendered}
    </div>
  );
}
