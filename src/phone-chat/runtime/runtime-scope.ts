import type { ExtensionContext } from "@avg-studio/sdk";
import { getPhoneSdkSlot } from "@ink-zenly/phone-sdk/plugin";

type ChatSlot = ReturnType<typeof getPhoneSdkSlot> & {
  chatRuntimeStores?: Map<string, WeakMap<object, unknown>>;
  chatLegacyScope?: object;
};

/** The controller and its hosted UI share the Preview flow signal. */
export function getChatRuntimeKey(ctx: ExtensionContext): object {
  return ctx.flow?.signal ?? ctx;
}

function storeFor(name: string): { store: WeakMap<object, unknown>; fallback: object } {
  const slot = getPhoneSdkSlot() as ChatSlot;
  slot.chatRuntimeStores ??= new Map();
  slot.chatLegacyScope ??= {};
  let store = slot.chatRuntimeStores.get(name);
  if (!store) {
    store = new WeakMap();
    slot.chatRuntimeStores.set(name, store);
  }
  return { store, fallback: slot.chatLegacyScope };
}

/** Keep each domain's state shared across bundles, but isolated by Preview. */
export function getChatScopedState<T>(name: string, key: object | undefined, create: () => T): T {
  const { store, fallback } = storeFor(name);
  const scope = key ?? fallback;
  if (!store.has(scope)) store.set(scope, create());
  return store.get(scope) as T;
}

export function deleteChatScopedState(name: string, key: object): void {
  storeFor(name).store.delete(key);
}
