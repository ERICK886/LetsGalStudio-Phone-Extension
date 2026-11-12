import { isPhoneExtensionId } from "../runtime/app-id";
import { getPhoneSdkSlot } from "../runtime/slot";
import { bootstrapPhonePluginApps } from "./bootstrap";
import type { PhonePluginAppRegistrar } from "./registry";

export interface PhonePluginDefinition {
  /** 必须与当前扩展 extension.json.id 相同。 */
  extensionId: string;
  /** 同步注册函数；应用控制器仍须由 Studio 入口显式导出。 */
  apps: readonly PhonePluginAppRegistrar[];
}

/** 注册完整软件包。支持宿主晚加载、重装、HMR 以及仅清理自己拥有的应用。 */
export function registerPhonePlugin(definition: PhonePluginDefinition): () => void {
  if (!isPhoneExtensionId(definition.extensionId)) throw new Error("[phone-sdk] 插件 extensionId 非法");
  if (!Array.isArray(definition.apps) || definition.apps.some((app) => typeof app !== "function")) {
    throw new Error("[phone-sdk] 插件 apps 必须是同步注册函数数组");
  }
  const extensionId = definition.extensionId.trim();
  const apps = [...definition.apps];
  const slot = getPhoneSdkSlot();
  slot.phonePlugins ??= new Map();
  slot.phonePlugins.get(extensionId)?.dispose();
  let disposers: Array<() => void> = [];
  let active = true;
  const run = () => {
    if (!active) return;
    const previous = slot.registrationContext;
    const oldDisposers = disposers;
    disposers = [];
    slot.registrationContext = { extensionId, disposers };
    try {
      for (const register of apps) {
        try { register(); }
        catch (error) { console.warn("[phone-sdk] 软件注册失败，继续注册其余软件", extensionId, error); }
      }
    } finally {
      slot.registrationContext = previous;
      // 新注册已取得新令牌，旧清理只能移除这次不再提供的应用。
      for (const dispose of oldDisposers) dispose();
    }
  };
  const detach = bootstrapPhonePluginApps(run, extensionId);
  const registration = { dispose: () => {
    if (!active) return;
    active = false;
    detach();
    for (const dispose of disposers) dispose();
    disposers = [];
    if (slot.phonePlugins?.get(extensionId) === registration) slot.phonePlugins.delete(extensionId);
  } };
  slot.phonePlugins.set(extensionId, registration);
  return registration.dispose;
}
