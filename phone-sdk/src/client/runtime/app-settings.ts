import { parseStudioProgramRef } from "./app-id";
import { getPhoneSdkSlot } from "./slot";
import { listRegisteredPhoneApps, notifyPhoneAppRegistryChanged } from "./register";

/** 由软件自己的 ExtensionContext.settings 提供，禁止冒用宿主跨模块命名空间。 */
export interface PhoneAppSettingsAccess {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  subscribe(key: string, listener: (value: unknown) => void): () => void;
}

export interface PhoneAppSettingsBinding {
  extensionId: string;
  programId: string;
  access: PhoneAppSettingsAccess;
}

/** 绑定当前软件上下文；abort/手动清理只释放自己，恢复仍有效的前一个上下文。 */
export function bindPhoneAppSettings(
  reference: string,
  access: PhoneAppSettingsAccess,
  signal?: AbortSignal,
): () => void {
  const ref = parseStudioProgramRef(reference);
  if (!ref?.extensionId) throw new Error("[phone-sdk] 设置桥须使用扩展ID/程序ID完整引用");
  if (signal?.aborted) return () => undefined;
  const slot = getPhoneSdkSlot();
  slot.phoneAppSettings ??= new Set();
  const binding = { ...ref, access };
  slot.phoneAppSettings.add(binding);
  const dispose = () => {
    signal?.removeEventListener("abort", dispose);
    if (slot.phoneAppSettings?.delete(binding)) notifyPhoneAppRegistryChanged();
  };
  signal?.addEventListener("abort", dispose, { once: true });
  notifyPhoneAppRegistryChanged();
  return dispose;
}

export function getPhoneAppSettings(reference: string): PhoneAppSettingsAccess | undefined {
  const ref = parseStudioProgramRef(reference);
  if (!ref) return undefined;
  const app = listRegisteredPhoneApps().find((item) => item.id === ref.programId);
  if (ref.extensionId && app?.extensionId && app.extensionId !== ref.extensionId) return undefined;
  const owner = ref.extensionId || app?.extensionId;
  const bindings = [...(getPhoneSdkSlot().phoneAppSettings ?? [])].filter((item) =>
    item.programId === ref.programId && (!owner || item.extensionId === owner));
  if (!owner && new Set(bindings.map((item) => item.extensionId)).size > 1) return undefined;
  return bindings[bindings.length - 1]?.access;
}
