import type { ExtensionContext } from "@avg-studio/sdk";
import type { PhoneToastData } from "../ui/toast-ui";

export interface ToastNotification extends PhoneToastData {
  id: number;
  exiting?: boolean;
}

export type ToastListener = (items: readonly ToastNotification[]) => void;

interface ToastRuntime {
  nextId: number;
  items: readonly ToastNotification[];
  listeners: Set<ToastListener>;
  timers: Map<number, ReturnType<typeof globalThis.setTimeout>>;
}

const TOAST_LIFETIME_MS = 2_600;
const runtimes = new WeakMap<object, ToastRuntime>();

function isKey(value: unknown): value is object {
  return value !== null && (typeof value === "object" || typeof value === "function");
}

function keysFor(ctx: ExtensionContext): object[] {
  const keys: object[] = [];
  const add = (value: unknown) => {
    if (isKey(value) && !keys.includes(value)) keys.push(value);
  };
  add(ctx.flow.signal);
  add(ctx.ui);
  add(ctx.ui.show);
  add(ctx.ui.hide);
  add(ctx);
  return keys;
}

function runtimeFor(ctx: ExtensionContext): ToastRuntime {
  const keys = keysFor(ctx);
  for (const key of keys) {
    const existing = runtimes.get(key);
    if (!existing) continue;
    keys.forEach((candidate) => runtimes.set(candidate, existing));
    return existing;
  }
  const runtime: ToastRuntime = { nextId: 1, items: [], listeners: new Set(), timers: new Map() };
  keys.forEach((key) => runtimes.set(key, runtime));
  return runtime;
}

function publish(runtime: ToastRuntime): void {
  for (const listener of runtime.listeners) listener(runtime.items);
}

export function enqueueToast(
  ctx: ExtensionContext,
  toast: Omit<ToastNotification, "id">,
): boolean {
  const runtime = runtimeFor(ctx);
  const wasEmpty = runtime.items.length === 0;
  const item: ToastNotification = { ...toast, id: runtime.nextId++ };
  runtime.items = [...runtime.items, item];
  publish(runtime);
  const timer = globalThis.setTimeout(() => {
    runtime.items = runtime.items.map((candidate) =>
      candidate.id === item.id ? { ...candidate, exiting: true } : candidate,
    );
    publish(runtime);
    const removalTimer = globalThis.setTimeout(() => {
      runtime.timers.delete(item.id);
      runtime.items = runtime.items.filter((candidate) => candidate.id !== item.id);
      publish(runtime);
    }, 320);
    runtime.timers.set(item.id, removalTimer);
  }, TOAST_LIFETIME_MS);
  runtime.timers.set(item.id, timer);
  return wasEmpty;
}

export function subscribeToasts(
  ctx: ExtensionContext,
  listener: ToastListener,
): () => void {
  const runtime = runtimeFor(ctx);
  runtime.listeners.add(listener);
  listener(runtime.items);
  return () => runtime.listeners.delete(listener);
}