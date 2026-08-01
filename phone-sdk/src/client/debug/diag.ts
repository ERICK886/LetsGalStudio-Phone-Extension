/**
 * @file diag.ts
 * @description Phone SDK 诊断快照与控制台日志（前缀 `[phone-sdk-diag]`）。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.2.0
 *
 * @remarks
 * 在 Studio 控制台用过滤词 `phone-sdk-diag` 查看。
 * 关闭：`globalThis.__LetsGalPhoneSdkDiag__ = false`
 * 本模块属于 `/plugin` 客户端工具，宿主不在此编写内页应用。
 */

import { toPhoneAppId } from "../runtime/app-id";
import { getPhoneSdkHost } from "../runtime/host";
import { getPhoneSdkAppsRegistry, getPhoneSdkSlot } from "../runtime/slot";

/** 控制台统一前缀，便于过滤。 */
export const PHONE_SDK_DIAG_PREFIX = "[phone-sdk-diag]";

/** 诊断开关；设为 `false` 可关闭，其余情况默认开启。 */
export const PHONE_SDK_DIAG_FLAG_KEY = "__LetsGalPhoneSdkDiag__" as const;

type GlobalWithDiagFlag = typeof globalThis & {
  [PHONE_SDK_DIAG_FLAG_KEY]?: boolean;
};

/**
 * 当前是否输出诊断日志。
 *
 * @returns 默认 `true`；显式设为 `false` 时关闭
 */
export function isPhoneSdkDiagEnabled(): boolean {
  return (globalThis as GlobalWithDiagFlag)[PHONE_SDK_DIAG_FLAG_KEY] !== false;
}

/**
 * Phone SDK 运行时快照（用于排查「未注册」类问题）。
 */
export interface PhoneSdkDiagSnapshot {
  /** 宿主是否已安装 */
  hostReady: boolean;
  /** 全局 `slot.apps` 注册表中的程序 ID 列表 */
  registeredIds: string[];
  /** 注册表条目数 */
  registeredCount: number;
  /** 当前宿主 `listApps()` 返回的 id（若与 registeredIds 不一致，说明宿主仍闭包了旧 Map） */
  hostListIds: string[];
  /** `registeredIds` 与 `hostListIds` 是否不一致 */
  registryHostMismatch: boolean;
  /** 是否已挂接 plugin 重注册钩子 */
  hasPluginDevReregister: boolean;
  /** 仍在排队、尚未刷入宿主的 id */
  queuedIds: string[];
  /** 排队注销的 id */
  unregisterQueuedIds: string[];
  /**
   * 主扩展是否打包了 `plugin/`（当前恒为 true；字段名保留兼容旧日志）。
   */
  phonePluginDev: boolean;
}

/**
 * 采集当前全局槽位与注册表快照。
 *
 * @returns 只读诊断数据
 */
export function capturePhoneSdkDiagSnapshot(): PhoneSdkDiagSnapshot {
  const slot = getPhoneSdkSlot();
  const apps = getPhoneSdkAppsRegistry();
  const host = getPhoneSdkHost() ?? slot.host;
  const registeredIds = [...apps.keys()].sort();
  const hostListIds = (host?.listApps().map((app) => app.id) ?? []).slice().sort();
  const registryHostMismatch =
    registeredIds.length !== hostListIds.length
    || registeredIds.some((id, index) => id !== hostListIds[index]);

  return {
    hostReady: Boolean(host),
    registeredIds,
    registeredCount: apps.size,
    hostListIds,
    registryHostMismatch,
    hasPluginDevReregister: typeof slot.pluginDevReregister === "function",
    queuedIds: slot.queue.map((item) => item.id),
    unregisterQueuedIds: [...slot.unregisterQueue],
    phonePluginDev: typeof __PHONE_PLUGIN_DEV__ !== "undefined" && __PHONE_PLUGIN_DEV__,
  };
}

/**
 * 输出一条 info 诊断日志。
 *
 * @param message - 简短说明
 * @param details - 可选详情（会自动附带快照若未传入 `snapshot`）
 * @returns void
 */
export function phoneSdkDiag(message: string, details?: Record<string, unknown>): void {
  if (!isPhoneSdkDiagEnabled()) return;

  const payload = {
    ...details,
    snapshot: details?.snapshot ?? capturePhoneSdkDiagSnapshot(),
  };

  console.info(PHONE_SDK_DIAG_PREFIX, message, payload);
}

/**
 * 输出一条警告诊断日志（查找失败等）。
 *
 * @param message - 警告说明
 * @param details - 可选详情
 * @returns void
 */
export function phoneSdkDiagWarn(message: string, details?: Record<string, unknown>): void {
  if (!isPhoneSdkDiagEnabled()) return;

  const payload = {
    ...details,
    snapshot: details?.snapshot ?? capturePhoneSdkDiagSnapshot(),
  };

  console.warn(PHONE_SDK_DIAG_PREFIX, message, payload);
}

/**
 * 诊断「按 phoneAppId 查找」结果。
 *
 * @param rawId - 作者填写的原始 id（可能是 扩展ID/程序ID）
 * @returns 规范化 key、是否命中、以及快照
 */
export function diagnosePhoneAppLookup(rawId: string): {
  rawId: string;
  normalizedId: string | null;
  found: boolean;
  snapshot: PhoneSdkDiagSnapshot;
} {
  const normalizedId = toPhoneAppId(rawId);
  const snapshot = capturePhoneSdkDiagSnapshot();
  const found = Boolean(normalizedId && snapshot.registeredIds.includes(normalizedId));

  return { rawId, normalizedId, found, snapshot };
}
