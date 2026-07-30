import {
  INTERNAL_SYSTEM_SLOT,
  isInternalSystemSlot,
  resolveUIRef,
  type ExtensionContext,
  type InternalSystemSlot,
} from "@avg-studio/sdk";

/**
 * 手机应用允许启动的受限目标集合。
 * 所有配置都必须先被解析为该判别联合，禁止从设置或存档中执行任意代码。
 *
 * - `program-ui.ref`：程序 UI 引用；本扩展使用 `ui-id`，跨扩展使用 `extension-id/ui-id`，不得带 `@`。
 * - `visual-ui.name`：项目 UI 使用 `ui-name`，扩展 UI 使用 `@extension-id/ui-name`。
 * - `extension-method`：SDK 暂无直接调用 API，`methodRef` 仅用于标识，实际由 `fragmentId` 适配 Fragment 执行。
 */
export type PhoneTarget =
  | { kind: "program-ui"; ref: string; props?: Record<string, unknown> }
  | { kind: "visual-ui"; name: string; modal?: boolean }
  | { kind: "system-slot"; slot: InternalSystemSlot }
  | {
      kind: "extension-method";
      methodRef: string;
      fragmentId: string;
      chapterId?: string;
    }
  | { kind: "fragment"; fragmentId: string; chapterId?: string }
  | { kind: "local-command"; commandId: LocalCommandId };

/** 允许由手机本地执行的固定命令；不接受作者或玩家动态扩展命令名称。 */
export type LocalCommandId =
  | "quick-save"
  | "quick-load"
  | "toggle-fullscreen";

/**
 * 作者目录或玩家草稿中的动作定义。
 * `id` 是应用绑定和玩家覆盖使用的稳定引用；`target` 必须通过运行时验证后才能启动。
 */
export interface PhoneActionDefinition {
  id: string;
  name: string;
  description?: string;
  target: PhoneTarget;
}

/** 作者提供的桌面应用模板；`defaultActionId` 必须引用目录中的动作。 */
export interface PhoneAppDefinition {
  id: string;
  name: string;
  icon?: string;
  enabled: boolean;
  locked: boolean;
  defaultActionId: string;
}

/** 版本固定为 1 的完整作者应用目录；解析时最多保留 100 个动作和 40 个应用。 */
export interface PhoneCatalog {
  version: 1;
  actions: PhoneActionDefinition[];
  apps: PhoneAppDefinition[];
}

/**
 * 写入 shared 存档的玩家个性化数据。
 * 运行时只读取存档列表第一项，并在进入 UI 前通过 `normalizePreferences` 净化所有不可信字段。
 */
export interface PlayerPhonePreferences {
  version: 1;
  wallpaperDataUrl?: string;
  backgroundCss?: string;
  accentColor?: string;
  shellColor?: string;
  appOverrides: Array<{ appId: string; name?: string; imageDataUrl?: string }>;
  actionBindings: Array<{ appId: string; actionId: string }>;
  actionOverrides: PhoneActionDefinition[];
}

/** 已合并作者目录与玩家偏好、可直接交给 React 桌面渲染的应用视图模型。 */
export interface ResolvedPhoneApp extends PhoneAppDefinition {
  displayName: string;
  iconSource?: string;
  actionId: string;
  action: PhoneActionDefinition;
}

const LOCAL_COMMANDS = new Set<LocalCommandId>([
  "quick-save",
  "quick-load",
  "toggle-fullscreen",
]);

const DEFAULT_CATALOG: PhoneCatalog = {
  version: 1,
  actions: [
    { id: "save", name: "存档", target: { kind: "system-slot", slot: INTERNAL_SYSTEM_SLOT.Save } },
    { id: "load", name: "读档", target: { kind: "system-slot", slot: INTERNAL_SYSTEM_SLOT.Load } },
    { id: "settings", name: "设置", target: { kind: "system-slot", slot: INTERNAL_SYSTEM_SLOT.Settings } },
    { id: "history", name: "历史记录", target: { kind: "system-slot", slot: INTERNAL_SYSTEM_SLOT.History } },
    { id: "gallery", name: "鉴赏", target: { kind: "system-slot", slot: INTERNAL_SYSTEM_SLOT.Gallery } },
    { id: "quick-save", name: "快速存档", target: { kind: "local-command", commandId: "quick-save" } },
    { id: "quick-load", name: "快速读档", target: { kind: "local-command", commandId: "quick-load" } },
    { id: "fullscreen", name: "切换全屏", target: { kind: "local-command", commandId: "toggle-fullscreen" } },
  ],
  apps: [
    { id: "save", name: "存档", enabled: true, locked: false, defaultActionId: "save" },
    { id: "load", name: "读档", enabled: true, locked: false, defaultActionId: "load" },
    { id: "settings", name: "设置", enabled: true, locked: false, defaultActionId: "settings" },
    { id: "history", name: "历史", enabled: true, locked: false, defaultActionId: "history" },
    { id: "gallery", name: "鉴赏", enabled: true, locked: false, defaultActionId: "gallery" },
    { id: "utility", name: "快捷工具", enabled: true, locked: false, defaultActionId: "fullscreen" },
  ],
};

/** 默认目录的 JSON 快照，供旧 JSON 设置为空或无效时回退；不是可变运行时状态。 */
export const DEFAULT_CATALOG_JSON = JSON.stringify(DEFAULT_CATALOG, null, 2);

/**
 * 创建独立的空 v1 偏好对象，适用于恢复默认或作者禁用玩家个性化的安全基线。
 * 每次调用均返回新的数组，调用方可安全进行不可变草稿更新。
 */
export function emptyPreferences(): PlayerPhonePreferences {
  return { version: 1, appOverrides: [], actionBindings: [], actionOverrides: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

function nonEmptyString(value: unknown, max = 256): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function isProgramUiRef(value: unknown): value is string {
  if (!nonEmptyString(value) || value.startsWith("@") || value !== value.trim()) return false;
  try {
    resolveUIRef(value, "ext-7a9373");
    return true;
  } catch {
    return false;
  }
}

function isVisualUiName(value: unknown): value is string {
  if (!nonEmptyString(value) || value !== value.trim() || /\s/.test(value)) return false;
  if (!value.startsWith("@")) return !value.includes("/");
  const parts = value.slice(1).split("/");
  return parts.length === 2 && parts.every((part) => part.length > 0);
}

function isExtensionMethodRef(value: unknown): value is string {
  return typeof value === "string" &&
    /^[^\s/@]+\/[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

function parseTarget(value: unknown): PhoneTarget | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  switch (value.kind) {
    case "program-ui": {
      if (!isProgramUiRef(value.ref)) return null;
      if (value.props !== undefined && !isRecord(value.props)) return null;
      const props = value.props as Record<string, unknown> | undefined;
      return { kind: "program-ui", ref: value.ref, ...(props ? { props } : {}) };
    }
    case "visual-ui":
      return isVisualUiName(value.name)
        ? { kind: "visual-ui", name: value.name, modal: value.modal !== false }
        : null;
    case "system-slot":
      return typeof value.slot === "string" && isInternalSystemSlot(value.slot)
        ? { kind: "system-slot", slot: value.slot }
        : null;
    case "extension-method":
      return isExtensionMethodRef(value.methodRef) &&
        nonEmptyString(value.fragmentId) &&
        (value.chapterId === undefined || nonEmptyString(value.chapterId))
        ? {
            kind: "extension-method",
            methodRef: value.methodRef,
            fragmentId: value.fragmentId,
            ...(typeof value.chapterId === "string" ? { chapterId: value.chapterId } : {}),
          }
        : null;
    case "fragment":
      return nonEmptyString(value.fragmentId) &&
        (value.chapterId === undefined || nonEmptyString(value.chapterId))
        ? {
            kind: "fragment",
            fragmentId: value.fragmentId,
            ...(typeof value.chapterId === "string" ? { chapterId: value.chapterId } : {}),
          }
        : null;
    case "local-command":
      return typeof value.commandId === "string" && LOCAL_COMMANDS.has(value.commandId as LocalCommandId)
        ? { kind: "local-command", commandId: value.commandId as LocalCommandId }
        : null;
    default:
      return null;
  }
}

function parseActionDefinition(raw: unknown): PhoneActionDefinition | null {
  if (!isRecord(raw) || !isSafeId(raw.id) || !nonEmptyString(raw.name, 32)) return null;
  const target = parseTarget(raw.target);
  if (!target) return null;
  return {
    id: raw.id,
    name: raw.name.trim(),
    ...(nonEmptyString(raw.description, 160) ? { description: raw.description.trim() } : {}),
    target,
  };
}

/**
 * 校验一条可编辑动作，并返回首个面向玩家的中文错误。
 * 不抛出异常，也不修改动作；用于保存草稿前阻止无效的 UI/Fragment/系统槽引用进入 shared 存档。
 */
export function getPhoneActionValidationError(
  action: PhoneActionDefinition,
): string | undefined {
  if (!isSafeId(action.id)) return "动作 ID 只能使用小写字母、数字和连字符";
  if (!nonEmptyString(action.name, 32)) return "动作名称不能为空且不能超过 32 个字符";
  if (!parseTarget(action.target)) return "动作目标未填写完整或格式无效";
  return undefined;
}

function readCatalog(value: unknown): PhoneCatalog | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.actions) || !Array.isArray(value.apps)) {
    return null;
  }

  const actionIds = new Set<string>();
  const actions: PhoneActionDefinition[] = [];
  for (const raw of value.actions.slice(0, 100)) {
    const action = parseActionDefinition(raw);
    if (!action || actionIds.has(action.id)) continue;
    actionIds.add(action.id);
    actions.push(action);
  }
  if (actions.length === 0) return null;

  const appIds = new Set<string>();
  const apps: PhoneAppDefinition[] = [];
  for (const raw of value.apps.slice(0, 40)) {
    if (!isRecord(raw) || !isSafeId(raw.id) || appIds.has(raw.id) || !nonEmptyString(raw.name, 24)) continue;
    const defaultActionId = typeof raw.defaultActionId === "string" && actionIds.has(raw.defaultActionId)
      ? raw.defaultActionId
      : actions[0].id;
    appIds.add(raw.id);
    apps.push({
      id: raw.id,
      name: raw.name.trim(),
      ...(nonEmptyString(raw.icon, 512) ? { icon: raw.icon } : {}),
      enabled: raw.enabled !== false,
      locked: raw.locked === true,
      defaultActionId,
    });
  }
  if (apps.length === 0) return null;
  return { version: 1, actions, apps };
}

export interface ActionSettingsRow {
  id?: string;
  name?: string;
  description?: string;
  targetKind?: string;
  programUiRef?: string;
  visualUiName?: string;
  modal?: boolean;
  systemSlot?: string;
  extensionMethodRef?: string;
  methodFragmentId?: string;
  methodChapterId?: string;
  fragmentId?: string;
  chapterId?: string;
  commandId?: string;
}

export interface GroupedActionSettingsRows {
  programUiActions?: unknown;
  visualUiActions?: unknown;
  systemSlotActions?: unknown;
  internalMethodActions?: unknown;
}

export interface AppSettingsRow {
  id?: string;
  name?: string;
  icon?: string;
  enabled?: boolean;
  locked?: boolean;
  defaultActionId?: string;
}

/**
 * 解析旧版 JSON 形式的应用目录。
 * 非字符串、JSON 语法错误或结构校验失败都会记录诊断并回退内置目录；调用方始终得到可用的 v1 数据，不需要 try/catch。
 */
export function parsePhoneCatalog(rawJson: unknown): PhoneCatalog {
  if (typeof rawJson !== "string") return DEFAULT_CATALOG;
  try {
    const parsed = readCatalog(JSON.parse(rawJson));
    if (parsed) return parsed;
    console.warn("[phone-config] 应用目录结构无效，已使用默认目录");
  } catch (error) {
    console.warn("[phone-config] 应用目录 JSON 无法解析，已使用默认目录", error);
  }
  return DEFAULT_CATALOG;
}

function actionFromSettingsRow(raw: unknown): PhoneActionDefinition | null {
  if (!isRecord(raw) || typeof raw.targetKind !== "string") return null;

  let target: unknown;
  switch (raw.targetKind) {
    case "program-ui":
      target = { kind: "program-ui", ref: raw.programUiRef };
      break;
    case "visual-ui":
      target = { kind: "visual-ui", name: raw.visualUiName, modal: raw.modal !== false };
      break;
    case "system-slot":
      target = { kind: "system-slot", slot: raw.systemSlot };
      break;
    case "extension-method":
      target = {
        kind: "extension-method",
        methodRef: raw.extensionMethodRef,
        fragmentId: raw.methodFragmentId,
        ...(nonEmptyString(raw.methodChapterId) ? { chapterId: raw.methodChapterId } : {}),
      };
      break;
    case "fragment":
      target = {
        kind: "fragment",
        fragmentId: raw.fragmentId,
        ...(nonEmptyString(raw.chapterId) ? { chapterId: raw.chapterId } : {}),
      };
      break;
    case "local-command":
      target = { kind: "local-command", commandId: raw.commandId };
      break;
    default:
      return null;
  }

  return parseActionDefinition({
    id: raw.id,
    name: raw.name,
    description: raw.description,
    target,
  });
}

function actionsFromSettingsRows(value: unknown): PhoneActionDefinition[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.slice(0, 100).flatMap((raw) => {
    const action = actionFromSettingsRow(raw);
    if (!action || ids.has(action.id)) return [];
    ids.add(action.id);
    return [action];
  });
}

function rowsWithTargetKind(value: unknown, targetKind: PhoneTarget["kind"]): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => isRecord(row) ? { ...row, targetKind } : row);
}

function actionsFromGroupedSettingsRows(
  groups: GroupedActionSettingsRows | undefined,
): PhoneActionDefinition[] {
  if (!groups) return [];
  return actionsFromSettingsRows([
    ...rowsWithTargetKind(groups.programUiActions, "program-ui"),
    ...rowsWithTargetKind(groups.visualUiActions, "visual-ui"),
    ...rowsWithTargetKind(groups.systemSlotActions, "system-slot"),
    ...rowsWithTargetKind(groups.internalMethodActions, "local-command"),
  ]);
}

function appsFromSettingsRows(
  value: unknown,
  actions: readonly PhoneActionDefinition[],
): PhoneAppDefinition[] {
  if (!Array.isArray(value) || actions.length === 0) return [];
  const actionIds = new Set(actions.map((action) => action.id));
  const appIds = new Set<string>();

  return value.slice(0, 40).flatMap((raw) => {
    if (!isRecord(raw) || !isSafeId(raw.id) || appIds.has(raw.id) || !nonEmptyString(raw.name, 24)) {
      return [];
    }
    appIds.add(raw.id);
    return [{
      id: raw.id,
      name: raw.name.trim(),
      ...(nonEmptyString(raw.icon, 512) ? { icon: raw.icon } : {}),
      enabled: raw.enabled !== false,
      locked: raw.locked === true,
      defaultActionId: typeof raw.defaultActionId === "string" && actionIds.has(raw.defaultActionId)
        ? raw.defaultActionId
        : actions[0].id,
    }];
  });
}

/**
 * 将 Studio 的分组 array 表单转换为统一运行时目录。
 *
 * @param legacyActionRows 旧版 `catalogActions` 宽表，仅在新分组表单没有有效动作时读取。
 * @param appRows 当前 Studio 的应用目录表单。
 * @param legacyJson 更早版本保存的 JSON 目录；无效时回退内置目录。
 * @param groupedRows 当前四个按目标类型拆分的动作表单。
 * @returns v1 目录。优先级为分组表单 > 旧宽表 > 旧 JSON/内置目录；配置动作按 ID 覆盖回退动作。
 * @remarks 目录始终至少返回一个可用应用，避免手机 UI 因项目配置不完整而白屏。
 */
export function catalogFromSettingsRows(
  legacyActionRows: unknown,
  appRows: unknown,
  legacyJson?: unknown,
  groupedRows?: GroupedActionSettingsRows,
): PhoneCatalog {
  const fallback = parsePhoneCatalog(legacyJson);
  const groupedActions = actionsFromGroupedSettingsRows(groupedRows);
  const legacyActions = actionsFromSettingsRows(legacyActionRows);
  const configuredActions = groupedActions.length > 0 ? groupedActions : legacyActions;
  const actions = configuredActions.length > 0
    ? [
        ...new Map([
          ...configuredActions.map((action) => [action.id, action] as const),
          ...fallback.actions.map((action) => [action.id, action] as const),
        ]).values(),
      ].slice(0, 100)
    : fallback.actions;
  const configuredApps = appsFromSettingsRows(appRows, actions);
  const apps = configuredApps.length > 0
    ? configuredApps
    : appsFromSettingsRows(fallback.apps, actions);

  return {
    version: 1,
    actions: [...actions],
    apps: apps.length > 0 ? apps : [{
      id: "phone",
      name: "手机",
      enabled: true,
      locked: false,
      defaultActionId: actions[0].id,
    }],
  };
}

function validDataImage(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= 3 * 1024 * 1024 &&
    /^data:image\/(?:png|jpeg|webp);base64,/i.test(value);
}

function validColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

/**
 * 验证作者或玩家提供的单个 CSS background 值。
 * 会 trim 并限制为 2048 字符，拒绝 `url()`、`@` 规则、分号和花括号，避免通过背景配置加载外部资源或注入额外规则。
 * @returns 安全的原字符串；非法或空值返回 `undefined`，调用方应回退作者默认背景。
 */
export function sanitizeBackgroundCss(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const css = value.trim();
  if (!css || css.length > 2048 || /[;{}@]|url\s*\(/i.test(css)) return undefined;
  return css;
}

/**
 * 将 shared 存档中的不可信玩家偏好净化为完整 v1 对象。
 * 只读取列表第一项；应用覆盖和绑定最多 40 条，动作覆盖最多 100 条且按 ID 去重；图片仅接受不超过 3 MiB 的 PNG/JPEG/WebP Data URL，
 * 颜色仅接受 `#RRGGBB`。无效字段静默丢弃，版本不符时返回新的空偏好，不会修改原始存档数组。
 */
export function normalizePreferences(
  value: readonly PlayerPhonePreferences[] | null | undefined,
): PlayerPhonePreferences {
  const raw = Array.isArray(value) ? value[0] : undefined;
  if (!isRecord(raw) || raw.version !== 1) return emptyPreferences();

  const appOverrides = Array.isArray(raw.appOverrides)
    ? raw.appOverrides.slice(0, 40).flatMap((item) => {
        if (!isRecord(item) || !isSafeId(item.appId)) return [];
        const name = nonEmptyString(item.name, 24) ? item.name.trim() : undefined;
        const imageDataUrl = validDataImage(item.imageDataUrl) ? item.imageDataUrl : undefined;
        return name || imageDataUrl ? [{ appId: item.appId, ...(name ? { name } : {}), ...(imageDataUrl ? { imageDataUrl } : {}) }] : [];
      })
    : [];

  const actionBindings = Array.isArray(raw.actionBindings)
    ? raw.actionBindings.slice(0, 40).flatMap((item) =>
        isRecord(item) && isSafeId(item.appId) && isSafeId(item.actionId)
          ? [{ appId: item.appId, actionId: item.actionId }]
          : [],
      )
    : [];

  const overrideIds = new Set<string>();
  const actionOverrides = Array.isArray(raw.actionOverrides)
    ? raw.actionOverrides.slice(0, 100).flatMap((item) => {
        const action = parseActionDefinition(item);
        if (!action || overrideIds.has(action.id)) return [];
        overrideIds.add(action.id);
        return [action];
      })
    : [];

  return {
    version: 1,
    ...(validDataImage(raw.wallpaperDataUrl) ? { wallpaperDataUrl: raw.wallpaperDataUrl } : {}),
    ...(sanitizeBackgroundCss(raw.backgroundCss) ? { backgroundCss: sanitizeBackgroundCss(raw.backgroundCss) } : {}),
    ...(validColor(raw.accentColor) ? { accentColor: raw.accentColor } : {}),
    ...(validColor(raw.shellColor) ? { shellColor: raw.shellColor } : {}),
    appOverrides,
    actionBindings,
    actionOverrides,
  };
}

/**
 * 合并作者动作目录与玩家动作覆盖。
 * 覆盖与内置动作同 ID 时替换原动作，不存在时允许作为玩家自定义动作加入；输入对象均不被修改。
 * 调用方应先使用 `normalizePreferences`，本函数不再次校验覆盖结构。
 */
export function mergePhoneCatalog(
  catalog: PhoneCatalog,
  preferences: PlayerPhonePreferences,
): PhoneCatalog {
  const actions = new Map(catalog.actions.map((action) => [action.id, action]));
  for (const override of preferences.actionOverrides) actions.set(override.id, override);
  return { ...catalog, actions: [...actions.values()] };
}

/**
 * 将目录与偏好解析为桌面实际展示的应用。
 * 会过滤 `enabled: false` 的应用，按有效玩家绑定或 `defaultActionId` 选择动作，叠加玩家名称/图标覆盖。
 * 如果目标动作已被删除，应用会被省略；`locked` 标记保留给编辑器决定是否允许修改。
 */
export function resolvePhoneApps(
  catalog: PhoneCatalog,
  preferences: PlayerPhonePreferences,
): ResolvedPhoneApp[] {
  const actions = new Map(catalog.actions.map((action) => [action.id, action]));
  const overrides = new Map(preferences.appOverrides.map((item) => [item.appId, item]));
  const bindings = new Map(preferences.actionBindings.map((item) => [item.appId, item.actionId]));

  return catalog.apps.filter((app) => app.enabled).flatMap((app) => {
    const override = overrides.get(app.id);
    const requestedActionId = bindings.get(app.id);
    const actionId = requestedActionId && actions.has(requestedActionId)
      ? requestedActionId
      : app.defaultActionId;
    const action = actions.get(actionId);
    if (!action) return [];
    return [{
      ...app,
      displayName: override?.name ?? app.name,
      iconSource: override?.imageDataUrl ?? app.icon,
      actionId,
      action,
    }];
  });
}

/**
 * 按受限目标类型调用 Studio Runtime API。
 * 程序 UI 使用 `ctx.ui.show`，可视化 UI 使用 `ctx.visualUI.open`，系统槽始终模态调用；Fragment 与扩展方法适配都会
 * 通过 `ctx.flow.callFragment` 执行。扩展方法分支不会直接执行 `methodRef`，因为 SDK 尚未公开该 API。
 * 本地命令仅允许快速存档、快速读档和切换全屏；宿主 API 的异步错误会向上传播给 UI 统一处理。
 */
export async function launchPhoneTarget(ctx: ExtensionContext, target: PhoneTarget): Promise<void> {
  switch (target.kind) {
    case "program-ui":
      await ctx.ui.show(target.ref, target.props);
      return;
    case "visual-ui":
      await ctx.visualUI.open(target.name, { modal: target.modal !== false });
      return;
    case "system-slot":
      await ctx.system.invoke(target.slot, undefined, { modal: true });
      return;
    case "extension-method":
      // SDK 暂无运行时 method invoke API；由作者提供的 Fragment 中的
      // “调用扩展方法”动作块执行 target.methodRef 对应方法。
      await ctx.flow.callFragment(
        target.fragmentId,
        target.chapterId ? { chapterId: target.chapterId } : undefined,
      );
      return;
    case "fragment":
      await ctx.flow.callFragment(target.fragmentId, target.chapterId ? { chapterId: target.chapterId } : undefined);
      return;
    case "local-command":
      if (target.commandId === "quick-save") await ctx.archive.quickSave();
      else if (target.commandId === "quick-load") await ctx.archive.quickLoad();
      else if (target.commandId === "toggle-fullscreen") await ctx.game.window.toggleFullscreen();
  }
}
