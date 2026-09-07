/**
 * @file runtime-key.ts
 * @description 为同一 Studio Preview 的相册扩展模块与手机宿主内页提供稳定隔离键。
 */

import type { ExtensionContext } from "@avg-studio/sdk";

/**
 * 同一 Preview 内不同扩展模块会拿到不同 Context 包装，但共享 flow AbortSignal。
 * 用它作为 WeakMap 键，可以隔离并行 Preview，同时让相册控制器与手机内页命中同一状态。
 */
export function getAlbumRuntimeKey(ctx: ExtensionContext): object {
  const signal = ctx.flow.signal;
  if (signal && (typeof signal === "object" || typeof signal === "function")) {
    return signal;
  }
  return ctx;
}
