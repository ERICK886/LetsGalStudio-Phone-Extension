/**
 * @file debug.ts
 * @description Phone SDK 调试日志：检测内页是否读取安全区等 render props。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.2
 */

import type { PhoneAppRenderProps, PhoneSafeAreaInsets } from "./types";

/** 控制台统一前缀，便于过滤。 */
export const PHONE_SDK_DEBUG_PREFIX = "[phone-sdk-debug]";

/** 全局开关键；设为 `false` 可关闭，其余情况默认开启。 */
export const PHONE_SDK_DEBUG_FLAG_KEY = "__LetsGalPhoneSdkDebug__" as const;

type GlobalWithDebugFlag = typeof globalThis & {
  [PHONE_SDK_DEBUG_FLAG_KEY]?: boolean;
};

/**
 * 是否输出 Phone SDK 调试日志。
 *
 * 默认开启。在控制台执行以下语句可关闭：
 * `globalThis.__LetsGalPhoneSdkDebug__ = false`
 *
 * @returns 当前是否启用调试
 */
export function isPhoneSdkDebugEnabled(): boolean {
  const flag = (globalThis as GlobalWithDebugFlag)[PHONE_SDK_DEBUG_FLAG_KEY];
  if (flag === false) return false;
  return true;
}

/**
 * 输出一条调试 info 日志（受开关控制）。
 *
 * @param message 简短说明
 * @param details 可选结构化详情
 */
export function phoneSdkDebug(message: string, details?: unknown): void {
  if (!isPhoneSdkDebugEnabled()) return;
  if (details !== undefined) {
    console.info(PHONE_SDK_DEBUG_PREFIX, message, details);
  } else {
    console.info(PHONE_SDK_DEBUG_PREFIX, message);
  }
}

/**
 * 输出一条调试警告（受开关控制）。
 *
 * @param message 警告说明
 * @param details 可选详情
 */
export function phoneSdkDebugWarn(message: string, details?: unknown): void {
  if (!isPhoneSdkDebugEnabled()) return;
  if (details !== undefined) {
    console.warn(PHONE_SDK_DEBUG_PREFIX, message, details);
  } else {
    console.warn(PHONE_SDK_DEBUG_PREFIX, message);
  }
}

/**
 * 一次 render 调用中对 SDK props 的访问统计。
 */
export interface PhoneSdkRenderPropsAccessReport {
  /** 被读取过的顶层 props 键名 */
  accessedProps: string[];
  /** 被读取过的 safeAreaInsets 字段 */
  accessedInsetFields: string[];
  /** 是否读取过 `safeAreaInsets` 对象本身 */
  usedSafeAreaInsets: boolean;
  /** 是否读取过任一 insets 数值字段（更可靠：spread 也会碰到对象本身） */
  usedSafeAreaInsetValues: boolean;
  /** 是否读取过 closeApp */
  usedCloseApp: boolean;
  /** 是否读取过 closePhone */
  usedClosePhone: boolean;
  /** 宿主实际传入的安全区快照 */
  safeAreaInsets: PhoneSafeAreaInsets;
  /** 应用 id */
  appId: string;
}

/**
 * 为 `registration.render(props)` 包一层 Proxy，统计第三方是否真正使用了 SDK 能力。
 *
 * @param props 宿主准备传给内页的原始 props
 * @returns 代理后的 props，以及稍后调用的 `flushReport`（建议在 rAF 后调用）
 *
 * @remarks
 * - 仅用 `{...props}` 展开会触发对 `safeAreaInsets` 对象的访问，但不一定读到 `.top`。
 * - 因此「是否使用安全区」以是否读取 `.top` / `.bottom` / `.left` / `.right` 为准。
 *
 * @example
 * ```ts
 * const { props, flushReport } = createDebugPhoneAppRenderProps(raw);
 * const node = registration.render(props);
 * requestAnimationFrame(() => flushReport());
 * ```
 */
export function createDebugPhoneAppRenderProps(props: PhoneAppRenderProps): {
  props: PhoneAppRenderProps;
  flushReport: () => PhoneSdkRenderPropsAccessReport;
} {
  const accessedProps = new Set<string>();
  const accessedInsetFields = new Set<string>();

  const insetsTarget: PhoneSafeAreaInsets = {
    top: props.safeAreaInsets.top,
    right: props.safeAreaInsets.right,
    bottom: props.safeAreaInsets.bottom,
    left: props.safeAreaInsets.left,
  };

  const safeAreaInsets = new Proxy(insetsTarget, {
    get(target, property, receiver) {
      if (
        property === "top" ||
        property === "right" ||
        property === "bottom" ||
        property === "left"
      ) {
        accessedInsetFields.add(property);
        phoneSdkDebug(`内页读取 safeAreaInsets.${property}`, {
          appId: props.appId,
          value: Reflect.get(target, property, receiver),
        });
      }
      return Reflect.get(target, property, receiver);
    },
  });

  const tracked: PhoneAppRenderProps = {
    appId: props.appId,
    closeApp: props.closeApp,
    closePhone: props.closePhone,
    safeAreaInsets,
  };

  const proxied = new Proxy(tracked, {
    get(target, property, receiver) {
      if (
        property === "appId" ||
        property === "closeApp" ||
        property === "closePhone" ||
        property === "safeAreaInsets"
      ) {
        accessedProps.add(property);
      }
      return Reflect.get(target, property, receiver);
    },
  });

  let lastReport: PhoneSdkRenderPropsAccessReport | null = null;

  const flushReport = (): PhoneSdkRenderPropsAccessReport => {
    const report: PhoneSdkRenderPropsAccessReport = {
      accessedProps: [...accessedProps],
      accessedInsetFields: [...accessedInsetFields],
      usedSafeAreaInsets: accessedProps.has("safeAreaInsets"),
      usedSafeAreaInsetValues: accessedInsetFields.size > 0,
      usedCloseApp: accessedProps.has("closeApp"),
      usedClosePhone: accessedProps.has("closePhone"),
      safeAreaInsets: { ...insetsTarget },
      appId: props.appId,
    };

    const changed =
      !lastReport ||
      lastReport.usedSafeAreaInsetValues !== report.usedSafeAreaInsetValues ||
      lastReport.accessedInsetFields.join() !== report.accessedInsetFields.join() ||
      lastReport.safeAreaInsets.top !== report.safeAreaInsets.top ||
      lastReport.safeAreaInsets.bottom !== report.safeAreaInsets.bottom;

    // 字段从「未读」变为「已读」时补打成功日志；避免首帧过早定论后无法翻案。
    if (changed) {
      lastReport = report;
      phoneSdkDebug("内页 SDK props 使用情况", report);

      if (!report.usedSafeAreaInsetValues) {
        phoneSdkDebugWarn(
          "内页未读取 safeAreaInsets 的 top/bottom/left/right；标题或按钮可能被状态栏/Home 遮挡（若稍后出现「已使用」可忽略本条）",
          { appId: props.appId, passedInsets: report.safeAreaInsets },
        );
      } else {
        phoneSdkDebug("内页已使用安全区数值", {
          appId: props.appId,
          fields: report.accessedInsetFields,
        });
      }
    }

    return report;
  };

  return { props: proxied, flushReport };
}
