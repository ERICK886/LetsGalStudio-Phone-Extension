/**
 * @file register.ts
 * @description Phone SDK 注册/注销/查询 API；宿主未就绪时排队。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.2.0
 */

import { isPhoneAppId, toPhoneAppId } from "./app-id";
import { phoneSdkDebug } from "../debug/debug";
import { getPhoneSdkSlot } from "./slot";
import { normalizeCustomPanesResolver } from "./normalize-custom-panes";
import type {
  PhoneAppRegistration,
  PhoneAppStyleEditorMeta,
  PhoneEditorContentItemSchema,
  PhoneEditorFieldType,
  PhoneEditorPageSchema,
} from "./types";

export { isPhoneAppId } from "./app-id";

/**
 * 规范化并校验一条注册描述。
 * `id` 会规约为 Studio 程序 ID（支持误填 `扩展ID/程序ID`）。
 *
 * @param app 原始注册对象
 * @returns 净化后的对象；非法时返回 `null` 并打警告
 */
function normalizeRegistration(app: PhoneAppRegistration): PhoneAppRegistration | null {
  if (!app || typeof app !== "object") {
    console.warn("[phone-sdk] registerPhoneApp: 参数无效");
    return null;
  }

  const normalizedId = typeof app.id === "string" ? toPhoneAppId(app.id) : null;
  if (!normalizedId || !isPhoneAppId(normalizedId)) {
    console.warn(
      "[phone-sdk] registerPhoneApp: id 须等于 Studio 程序 ID（@extension({ id })），"
        + "也可填写「扩展ID/程序ID」由 SDK 自动取程序段。示例：phone-snake 或 ink.zenly.ext-phone-snake/phone-snake",
      app.id,
    );
    return null;
  }

  if (typeof app.render !== "function") {
    console.warn("[phone-sdk] registerPhoneApp: render 必须是函数", normalizedId);
    return null;
  }

  const title = typeof app.title === "string" && app.title.trim()
    ? app.title.trim().slice(0, 64)
    : undefined;
  const description = typeof app.description === "string" && app.description.trim()
    ? app.description.trim().slice(0, 160)
    : undefined;
  const styleEditor = normalizeStyleEditor(app.styleEditor);

  return {
    id: normalizedId,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(styleEditor ? { styleEditor } : {}),
    render: app.render,
  };
}

/**
 * 规范化 `styleEditor` 字段；非法对象忽略。
 *
 * @param raw - 原始 styleEditor
 * @returns 净化后的元数据或 undefined
 */
function normalizeStyleEditor(
  raw: PhoneAppRegistration["styleEditor"],
): PhoneAppRegistration["styleEditor"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const enabled = raw.enabled === false ? false : true;
  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim().slice(0, 40)
      : undefined;
  const icon =
    typeof raw.icon === "string" && raw.icon.trim()
      ? raw.icon.trim().slice(0, 64)
      : undefined;
  const order =
    typeof raw.order === "number" && Number.isFinite(raw.order)
      ? raw.order
      : undefined;
  const pages = normalizeEditorPages(raw.pages);
  const contentItems = normalizeEditorContentItems(raw.contentItems);
  const settingsModuleId =
    typeof raw.settingsModuleId === "string" && raw.settingsModuleId.trim()
      ? raw.settingsModuleId.trim().slice(0, 64)
      : undefined;

  return {
    enabled,
    ...(label ? { label } : {}),
    ...(icon ? { icon } : {}),
    ...(order !== undefined ? { order } : {}),
    ...(settingsModuleId ? { settingsModuleId } : {}),
    ...(contentItems ? { contentItems } : {}),
    ...(pages ? { pages } : {}),
    ...normalizeCustomPanesResolver(raw),
  };
}

const FIELD_TYPES = new Set<PhoneEditorFieldType>([
  "string",
  "color",
  "enum",
  "asset",
  "shortcut",
  "boolean",
]);

/**
 * 规范化 styleEditor.contentItems。
 *
 * @param raw - 原始内容项
 * @returns 净化列表或 undefined
 */
function normalizeEditorContentItems(
  raw: PhoneAppStyleEditorMeta["contentItems"] | undefined,
): PhoneEditorContentItemSchema[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const items: PhoneEditorContentItemSchema[] = [];

  for (const item of raw.slice(0, 80)) {
    if (!item || typeof item !== "object") continue;
    const id =
      typeof item.id === "string" && item.id.trim()
        ? item.id.trim().slice(0, 64)
        : "";
    const group =
      typeof item.group === "string" && item.group.trim()
        ? item.group.trim().slice(0, 40)
        : "";
    const label =
      typeof item.label === "string" && item.label.trim()
        ? item.label.trim().slice(0, 40)
        : "";
    if (!id || !group || !label) continue;
    if (!FIELD_TYPES.has(item.fieldType)) continue;

    const icon =
      typeof item.icon === "string" && item.icon.trim()
        ? item.icon.trim().slice(0, 64)
        : undefined;
    const defaultValue =
      typeof item.defaultValue === "string" ? item.defaultValue : "";
    const description =
      typeof item.description === "string" && item.description.trim()
        ? item.description.trim().slice(0, 240)
        : undefined;
    const settingKey =
      typeof item.settingKey === "string" && item.settingKey.trim()
        ? item.settingKey.trim().slice(0, 64)
        : undefined;
    const allowEmpty = item.allowEmpty === true ? true : undefined;
    const multiline = item.multiline === true ? true : undefined;
    const settingsModuleId =
      typeof item.settingsModuleId === "string" && item.settingsModuleId.trim()
        ? item.settingsModuleId.trim().slice(0, 64)
        : undefined;
    const dependsOn =
      item.dependsOn &&
      typeof item.dependsOn === "object" &&
      typeof item.dependsOn.contentItemId === "string" &&
      item.dependsOn.contentItemId.trim() &&
      typeof item.dependsOn.equals === "string"
        ? {
            contentItemId: item.dependsOn.contentItemId.trim().slice(0, 64),
            equals: item.dependsOn.equals.slice(0, 64),
          }
        : undefined;
    const enumOptions = Array.isArray(item.enumOptions)
      ? item.enumOptions
          .filter(
            (opt): opt is { value: string; label: string } =>
              Boolean(opt) &&
              typeof opt === "object" &&
              typeof opt.value === "string" &&
              typeof opt.label === "string",
          )
          .map((opt) => ({
            value: opt.value.trim().slice(0, 64),
            label: opt.label.trim().slice(0, 40),
          }))
          .filter((opt) => opt.value && opt.label)
          .slice(0, 40)
      : undefined;

    items.push({
      id,
      group,
      label,
      fieldType: item.fieldType,
      defaultValue,
      ...(icon ? { icon } : {}),
      ...(description ? { description } : {}),
      ...(settingKey ? { settingKey } : {}),
      ...(allowEmpty ? { allowEmpty } : {}),
      ...(multiline ? { multiline } : {}),
      ...(settingsModuleId ? { settingsModuleId } : {}),
      ...(dependsOn ? { dependsOn } : {}),
      ...(enumOptions && enumOptions.length > 0 ? { enumOptions } : {}),
    });
  }

  return items.length > 0 ? items : undefined;
}

/**
 * 规范化 `styleEditor.pages`；非法项丢弃，全空则返回 undefined。
 *
 * @param raw - 原始 pages
 * @returns 净化后的页面列表
 */
function normalizeEditorPages(
  raw: PhoneAppStyleEditorMeta["pages"] | undefined,
): PhoneEditorPageSchema[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const pages: PhoneEditorPageSchema[] = [];

  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== "object") continue;
    const id =
      typeof item.id === "string" && item.id.trim()
        ? item.id.trim().slice(0, 64)
        : "";
    const label =
      typeof item.label === "string" && item.label.trim()
        ? item.label.trim().slice(0, 40)
        : "";
    if (!id || !label) continue;

    const icon =
      typeof item.icon === "string" && item.icon.trim()
        ? item.icon.trim().slice(0, 64)
        : undefined;
    const order =
      typeof item.order === "number" && Number.isFinite(item.order)
        ? item.order
        : undefined;
    const status =
      item.status === "comingSoon" || item.status === "ready"
        ? item.status
        : undefined;
    const preview =
      item.preview === "desktop" ||
      item.preview === "chat" ||
      item.preview === "placeholder"
        ? item.preview
        : undefined;
    const contentItemIds = Array.isArray(item.contentItemIds)
      ? item.contentItemIds
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => x.trim().slice(0, 64))
          .slice(0, 80)
      : undefined;

    pages.push({
      id,
      label,
      ...(icon ? { icon } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(status ? { status } : {}),
      ...(preview ? { preview } : {}),
      ...(contentItemIds && contentItemIds.length > 0
        ? { contentItemIds }
        : {}),
    });
  }

  return pages.length > 0 ? pages : undefined;
}

/**
 * 向手机扩展注册一个可在手机内部显示的应用。
 *
 * @param app 应用描述（id + render 必填）；`id` 必须与本程序 `@extension({ id })` 一致
 * @returns void
 * @throws 不抛出；非法参数只警告并忽略
 *
 * @example
 * ```ts
 * const PROGRAM_ID = "phone-snake";
 *
 * @extension({ id: PROGRAM_ID, label: "贪吃蛇", exposeUI: false })
 * class PhoneSnakeExtension extends Extension {
 *   static onRegister() {
 *     registerPhoneApp({
 *       id: PROGRAM_ID,
 *       render: (props) => <SnakeApp {...props} />,
 *     });
 *   }
 * }
 * ```
 */
export function registerPhoneApp(app: PhoneAppRegistration): void {
  const normalized = normalizeRegistration(app);
  if (!normalized) return;

  const slot = getPhoneSdkSlot();
  if (slot.host) {
    slot.host.registerApp(normalized);
    phoneSdkDebug("registerPhoneApp → 已写入宿主", {
      id: normalized.id,
      title: normalized.title,
      hostReady: true,
      queued: false,
    });
    notifyPhoneAppRegistryChanged();
    return;
  }

  const index = slot.queue.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    console.warn("[phone-sdk] 宿主未就绪，队列中同 id 注册将被覆盖", normalized.id);
    slot.queue[index] = normalized;
  } else {
    slot.queue.push(normalized);
  }
  phoneSdkDebug("registerPhoneApp → 宿主未就绪，已入队", {
    id: normalized.id,
    title: normalized.title,
    hostReady: false,
    queueLength: slot.queue.length,
  });
  notifyPhoneAppRegistryChanged();
}

/**
 * 注销此前注册的手机内部应用。
 *
 * @param id 程序 ID，或 `扩展ID/程序ID`（自动取程序段）
 * @returns void
 */
export function unregisterPhoneApp(id: string): void {
  const normalizedId = toPhoneAppId(id);
  if (!normalizedId) {
    console.warn("[phone-sdk] unregisterPhoneApp: id 无效", id);
    return;
  }

  const slot = getPhoneSdkSlot();
  if (slot.host) {
    slot.host.unregisterApp(normalizedId);
    phoneSdkDebug("unregisterPhoneApp → 已从宿主移除", { id: normalizedId, hostReady: true });
    notifyPhoneAppRegistryChanged();
    return;
  }

  slot.queue = slot.queue.filter((item) => item.id !== normalizedId);
  if (!slot.unregisterQueue.includes(normalizedId)) {
    slot.unregisterQueue.push(normalizedId);
  }
  phoneSdkDebug("unregisterPhoneApp → 宿主未就绪，已记入注销队列", {
    id: normalizedId,
    hostReady: false,
    unregisterQueueLength: slot.unregisterQueue.length,
  });
  notifyPhoneAppRegistryChanged();
}

/**
 * 查询当前宿主中已生效的应用；宿主未安装时返回 `undefined`。
 *
 * @param id 程序 ID，或 `扩展ID/程序ID`
 * @returns 注册对象或 `undefined`
 */
export function getRegisteredPhoneApp(id: string): PhoneAppRegistration | undefined {
  const normalizedId = toPhoneAppId(id);
  if (!normalizedId) return undefined;
  return getPhoneSdkSlot().host?.getApp(normalizedId);
}

/**
 * 列出已注册（或宿主未就绪时队列中）的全部内页应用。
 *
 * @returns 只读应用列表
 */
export function listRegisteredPhoneApps(): readonly PhoneAppRegistration[] {
  const slot = getPhoneSdkSlot();
  if (slot.host) {
    return slot.host.listApps();
  }
  return [...slot.queue];
}

/**
 * 订阅内页注册表变更（register / unregister）。
 *
 * @param listener - 无参回调
 * @returns 取消订阅函数
 *
 * @example
 * ```ts
 * const off = subscribePhoneAppRegistry(() => forceUpdate());
 * ```
 */
export function subscribePhoneAppRegistry(listener: () => void): () => void {
  const slot = getPhoneSdkSlot();
  if (!slot.phoneAppRegistryListeners) {
    slot.phoneAppRegistryListeners = new Set();
  }
  slot.phoneAppRegistryListeners.add(listener);
  return () => {
    slot.phoneAppRegistryListeners?.delete(listener);
  };
}

/**
 * 通知注册表订阅者（宿主 register/unregister 后调用）。
 *
 * @returns void
 */
export function notifyPhoneAppRegistryChanged(): void {
  const listeners = getPhoneSdkSlot().phoneAppRegistryListeners;
  if (!listeners || listeners.size === 0) return;
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      console.warn("[phone-sdk] phoneAppRegistry listener 失败", error);
    }
  }
}
