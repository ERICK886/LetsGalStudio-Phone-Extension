/** 应用描述解析独立于注册状态，不写设置、存档或全局槽位。 */
import { isPhoneAppId, toPhoneAppId, parseStudioProgramRef, isPhoneExtensionId } from "./app-id";
import { normalizeCustomPanesResolver } from "./normalize-custom-panes";
import type { PhoneAppRegistration, PhoneAppStyleEditorMeta, PhoneEditorContentItemSchema, PhoneEditorFieldType, PhoneEditorPageSchema } from "./types";

export interface PhoneAppParseIssue { path: string; message: string }
export interface PhoneAppParseResult { app: PhoneAppRegistration | null; issues: PhoneAppParseIssue[] }

/** 解析旧版和带来源的应用描述；非法的必填字段返回 app: null。 */
export function parsePhoneAppRegistration(input: unknown): PhoneAppParseResult {
  const issues: PhoneAppParseIssue[] = [];
  const app = normalizeRegistration(input as PhoneAppRegistration, issues);
  if (app && input && typeof input === "object") {
    const raw = (input as PhoneAppRegistration).styleEditor;
    if (raw && typeof raw === "object") {
      for (const [index, item] of (Array.isArray(raw.contentItems) ? raw.contentItems : []).entries()) {
        if (!item || !FIELD_TYPES.has(item.fieldType) || !app.styleEditor?.contentItems?.some((field) => field.id === (typeof item.id === "string" ? item.id.trim() : ""))) {
          issues.push({ path: `styleEditor.contentItems[${index}]`, message: "字段无效或超出支持范围，已忽略" });
        }
      }
      for (const [index, page] of (Array.isArray(raw.pages) ? raw.pages : []).entries()) {
        if (!page || !app.styleEditor?.pages?.some((item) => item.id === (typeof page.id === "string" ? page.id.trim() : ""))) {
          issues.push({ path: `styleEditor.pages[${index}]`, message: "页面无效或超出支持范围，已忽略" });
        }
      }
    }
  }
  return { app, issues };
}

/**
 * 规范化并校验一条注册描述。
 * `id` 会规约为 Studio 程序 ID（支持误填 `扩展ID/程序ID`）。
 *
 * @param app 原始注册对象
 * @returns 净化后的对象；非法时返回 `null` 并打警告
 */
function normalizeRegistration(app: PhoneAppRegistration, issues: PhoneAppParseIssue[]): PhoneAppRegistration | null {
  if (!app || typeof app !== "object") {
    issues.push({ path: "", message: "注册描述必须是对象" });
    return null;
  }

  const normalizedId = typeof app.id === "string" ? toPhoneAppId(app.id) : null;
  if (!normalizedId || !isPhoneAppId(normalizedId)) {
    issues.push({ path: "id", message: "id 必须是程序 ID 或扩展ID/程序ID" });
    return null;
  }

  if (typeof app.render !== "function") {
    issues.push({ path: "render", message: "render 必须是函数" });
    return null;
  }

  const reference = parseStudioProgramRef(app.id)!;
  const suppliedOwner = app.extensionId;
  if (suppliedOwner !== undefined && !isPhoneExtensionId(suppliedOwner)) {
    issues.push({ path: "extensionId", message: "extensionId 非法" });
    return null;
  }
  const extensionId = suppliedOwner?.trim() || reference.extensionId;
  if (suppliedOwner && reference.extensionId && suppliedOwner.trim() !== reference.extensionId) {
    issues.push({ path: "extensionId", message: "extensionId 与完整引用的扩展段不一致" });
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
    ...(extensionId ? { extensionId } : {}),
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
  "number",
  "character",
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
    const assetKind = item.fieldType === "asset" &&
      (item.assetKind === "image" ||
        item.assetKind === "audio" ||
        item.assetKind === "video" ||
        item.assetKind === "any")
      ? item.assetKind
      : undefined;
    const multiline = item.multiline === true ? true : undefined;
    const min = typeof item.min === "number" && Number.isFinite(item.min) ? item.min : undefined;
    const max = typeof item.max === "number" && Number.isFinite(item.max) ? item.max : undefined;
    const step = typeof item.step === "number" && Number.isFinite(item.step) && item.step > 0
      ? item.step
      : undefined;
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
      ...(assetKind ? { assetKind } : {}),
      ...(multiline ? { multiline } : {}),
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(step !== undefined ? { step } : {}),
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
      item.preview === "phone-call" ||
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
