import type { ExtensionContext } from "@avg-studio/sdk";
import { activatePhoneRuntime, getPhoneRuntime, hidePhoneUi } from "../extension/phone-extension";
import { createNavigationController } from "./navigation-controller";
import { installNavigationBinding } from "./navigation-binding";

/** Bind Studio operations here; the controller owns navigation and waiting. */
export function createPhoneNavigationController(ctx: ExtensionContext, signal = ctx.flow.signal) {
  return createNavigationController(ctx, signal, {
    getState: () => getPhoneRuntime(ctx),
    activate: () => activatePhoneRuntime(ctx, getPhoneRuntime(ctx)),
    hide: () => hidePhoneUi(ctx),
  });
}

/**
 * 把导航控制器写入全局槽位，供插件侧 `openPhoneApp` 委托调用。
 *
 * @param ctx 手机扩展的 ExtensionContext（来自 onRegister）
 *
 * @remarks
 * 必须在 `PhoneExtension.onRegister(ctx)` 中调用，确保控制器闭包住手机 ctx 而非聊天 ctx。
 * 返回的清理函数取消自身等待，并且只卸载自己安装的控制器。
 */
export function bindPhoneNavigationController(ctx: ExtensionContext): () => void {
  const lifetime = new AbortController();
  const abort = () => lifetime.abort();
  if (ctx.flow.signal.aborted) abort();
  else ctx.flow.signal.addEventListener("abort", abort, { once: true });
  const uninstall = installNavigationBinding(createPhoneNavigationController(ctx, lifetime.signal));
  return () => {
    abort();
    ctx.flow.signal.removeEventListener("abort", abort);
    uninstall();
  };
}
