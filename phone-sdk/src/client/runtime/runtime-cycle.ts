import type { ExtensionContext } from "@avg-studio/sdk";
import { getPhoneSdkSlot } from "./slot";

type CycleSlot = ReturnType<typeof getPhoneSdkSlot> & {
  runtimeCycleRegistrations?: WeakMap<object, Map<string, () => void>>;
};

/**
 * onRegister 只执行一次，flow.signal 却会在切换运行周期后更换。
 * 每个周期安装一次资源；abort 只释放该周期，runtime:started 安装后继周期。
 * 返回值用于扩展卸载；重复注册同一 owner 会替换旧订阅。SDK 会在 Engine 销毁时清理事件订阅。
 */
export function registerPhoneRuntimeCycle(
  ctx: ExtensionContext,
  owner: string,
  install: (signal: AbortSignal) => () => void,
): () => void {
  const slot = getPhoneSdkSlot() as CycleSlot;
  slot.runtimeCycleRegistrations ??= new WeakMap();
  let owners = slot.runtimeCycleRegistrations.get(ctx.flow);
  if (!owners) {
    owners = new Map();
    slot.runtimeCycleRegistrations.set(ctx.flow, owners);
  }
  owners.get(owner)?.();
  let currentSignal: AbortSignal | undefined;
  let release: (() => void) | undefined;
  let disposed = false;
  const stop = () => {
    currentSignal?.removeEventListener("abort", stop);
    const cleanup = release;
    release = undefined;
    cleanup?.();
  };
  const start = () => {
    const signal = ctx.flow.signal;
    if (disposed || signal.aborted || signal === currentSignal) return;
    stop();
    currentSignal = signal;
    release = install(signal);
    if (signal.aborted) stop();
    else signal.addEventListener("abort", stop, { once: true });
  };
  const unsubscribe = ctx.subscribe("runtime:started", start);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    stop();
    if (owners.get(owner) === dispose) owners.delete(owner);
  };
  owners.set(owner, dispose);
  try {
    start();
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
}
