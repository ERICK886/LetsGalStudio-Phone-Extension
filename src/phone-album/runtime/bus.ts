/**
 * @file bus.ts
 * @description 相册变更总线：方法写入存档后通知内页刷新列表 / 切换动画。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * 与 chat 应用对齐：`Set<() => void>` 形态的订阅 / 发布。
 * 相册场景无需细分事件类型，统一用无参回调通知 UI 重新读取存档快照。
 */

type Listener = () => void;

const listenersByRuntime = new WeakMap<object, Set<Listener>>();

function listenersFor(runtimeKey: object): Set<Listener> {
  const existing = listenersByRuntime.get(runtimeKey);
  if (existing) return existing;
  const created = new Set<Listener>();
  listenersByRuntime.set(runtimeKey, created);
  return created;
}

/**
 * 订阅相册总线事件。
 *
 * @param listener - 无参回调，被 `emitAlbumBus()` 调用
 * @returns 取消订阅函数
 *
 * @example
 * ```ts
 * const off = subscribeAlbumBus(runtimeKey, () => {
 *   setCatalog(buildAlbumCatalog(
 *     getCachedAuthorSettings(runtimeKey),
 *     getAlbumSaveState(runtimeKey),
 *   ));
 * });
 * // 卸载时
 * off();
 * ```
 */
export function subscribeAlbumBus(
  runtimeKey: object,
  listener: Listener,
): () => void {
  const listeners = listenersFor(runtimeKey);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 发布相册变更通知：依次同步调用所有监听器。
 *
 * 单个监听器抛错不会中断其他监听器，错误会被 `console.error` 兜底。
 */
export function emitAlbumBus(runtimeKey: object): void {
  const listeners = listenersByRuntime.get(runtimeKey);
  if (!listeners) return;
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error("[phone-album] bus listener error", error);
    }
  }
}

/** 清理一个 Preview 的监听器，供 flow abort / 热重注册使用。 */
export function disposeAlbumBus(runtimeKey: object): void {
  listenersByRuntime.get(runtimeKey)?.clear();
  listenersByRuntime.delete(runtimeKey);
}
