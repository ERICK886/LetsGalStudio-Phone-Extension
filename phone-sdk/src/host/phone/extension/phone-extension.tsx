import {
  Extension,
  INTERNAL_SYSTEM_SLOT,
  defineSave,
  extension,
  method,
  normalizeShortcut,
  settings,
  type ExtensionContext,
  type ExtensionProps,
  type ExtensionRenderData,
  type SaveAPI,
} from "@avg-studio/sdk";
import {
  catalogFromSettingsRows,
  normalizePhoneAppAvailability,
  type PhoneAppAvailabilityOverride,
  type PlayerPhonePreferences,
} from "../catalog";
import { installPhoneExtensionSdkHost } from "../runtime/install-host";
import { PhoneUI } from "../ui/phone-ui";
import { enqueueToast } from "../../toast/core/toast-runtime";
import {
  PHONE_TOAST_ANIMATIONS_IN,
  PHONE_TOAST_ANIMATIONS_OUT,
  PHONE_TOAST_POSITIONS,
  PHONE_TOAST_STACK_DIRECTIONS,
  type PhoneToastAnimationIn,
  type PhoneToastAnimationOut,
  type PhoneToastData,
  type PhoneToastPosition,
  type PhoneToastStackDirection,
} from "../../toast/ui/toast-ui";
import { getOpenPhoneActionId } from "../../host-extension-id";
import {
  DEFAULT_CHAT_ROLE_BUBBLE_COLOR,
  DEFAULT_CHAT_ROLE_CUSTOM_CSS,
  DEFAULT_CHAT_ROLE_FONT_SIZE,
  DEFAULT_CHAT_ROLE_NAME_COLOR,
  DEFAULT_CHAT_ROLE_TEXT_COLOR,
  normalizeChatRoleBubbleStyle,
  type ChatRoleBubbleStyleFields,
} from "./chat-role-bubble-style";
import {
  normalizePresetVisibilityFlag,
  resolveStoryVisibility,
  STORY_VISIBILITY_OVERRIDES,
} from "./story-message-visibility";

const OPEN_PHONE_ACTION = getOpenPhoneActionId();
const DEFAULT_OPEN_PHONE_SHORTCUT = "ArrowUp";
/** 宿主未完成 show 时的保险释放时间，避免一次异常显示永久阻塞后续打开动作。 */
const NORMAL_PHONE_OPEN_TIMEOUT_MS = 1_200;
const PHONE_POPUP_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "center",
] as const;
export type PhonePopupPosition = (typeof PHONE_POPUP_POSITIONS)[number];

const TOAST_POSITION_OPTIONS = [
  { label: "左上", value: "top-left" },
  { label: "中上", value: "top-center" },
  { label: "右上", value: "top-right" },
  { label: "左中", value: "middle-left" },
  { label: "中部", value: "center" },
  { label: "右中", value: "middle-right" },
  { label: "左下", value: "bottom-left" },
  { label: "中下", value: "bottom-center" },
  { label: "右下", value: "bottom-right" },
] as const;
const TOAST_ANIMATION_IN_OPTIONS = [
  { label: "淡入", value: "fade-in" },
  { label: "缩入", value: "scale-in" },
  { label: "滑入", value: "slide-in" },
  { label: "弹入", value: "bounce-in" },
] as const;
const TOAST_ANIMATION_OUT_OPTIONS = [
  { label: "淡出", value: "fade-out" },
  { label: "缩出", value: "scale-out" },
  { label: "滑出", value: "slide-out" },
  { label: "弹出", value: "bounce-out" },
] as const;
const TOAST_STACK_DIRECTION_OPTIONS = [
  { label: "显示在前一条上方", value: "above" },
  { label: "显示在前一条下方", value: "below" },
] as const;
const LOCAL_COMMAND_IDS = [
  "quick-save",
  "quick-load",
  "toggle-fullscreen",
] as const;
const SYSTEM_SLOT_IDS = [
  INTERNAL_SYSTEM_SLOT.Title,
  INTERNAL_SYSTEM_SLOT.Toolbar,
  INTERNAL_SYSTEM_SLOT.Save,
  INTERNAL_SYSTEM_SLOT.Load,
  INTERNAL_SYSTEM_SLOT.Settings,
  INTERNAL_SYSTEM_SLOT.History,
  INTERNAL_SYSTEM_SLOT.Gallery,
] as const;

const PHONE_DEBUG_PREFIX = "[phone-debug]";
let nextStorySequenceDebugId = 1;

function debugSnapshot(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= 4) return "[max-depth]";
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => debugSnapshot(item, depth + 1, seen));
  }

  const output: Record<string, unknown> = {};
  try {
    for (const [key, item] of Object.entries(value)) {
      output[key] = debugSnapshot(item, depth + 1, seen);
    }
  } catch (error) {
    return `[unreadable: ${error instanceof Error ? error.message : String(error)}]`;
  }
  return output;
}

function phoneDebug(event: string, details?: unknown): void {
  if (details === undefined) console.log(PHONE_DEBUG_PREFIX, event);
  else console.log(PHONE_DEBUG_PREFIX, event, debugSnapshot(details));
}

/** 将作者设置或旧项目中的快捷键安全归一化；无效值回退为默认上箭头。 */
function normalizeOpenPhoneShortcut(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_OPEN_PHONE_SHORTCUT;
  try {
    return normalizeShortcut(value);
  } catch (error) {
    console.warn("[phone] 打开手机快捷键无效，已回退 ArrowUp", value, error);
    return DEFAULT_OPEN_PHONE_SHORTCUT;
  }
}

type PhoneSaveMap = {
  preferences: readonly PlayerPhonePreferences[];
  appAvailability: readonly PhoneAppAvailabilityOverride[];
};

export type PhoneMessageDirection = "incoming" | "outgoing";
export type PhoneMessageStatus =
  | "sending"
  | "unread"
  | "read"
  | "failed"
  | "blocked";
export type ChatRoleAvatarSource =
  | "first-portrait"
  | "character-avatar"
  | "asset";

const CHAT_ROLE_AVATAR_SOURCES = [
  "first-portrait",
  "character-avatar",
  "asset",
] as const;
const OUTGOING_MESSAGE_STATUSES = [
  "sending",
  "unread",
  "read",
  "failed",
  "blocked",
] as const;
const DEFAULT_BLOCKED_HINT = "您的消息已发送，但被对方拒收";

/**
 * 聊天角色预设（settings 归一化后的内部结构）。
 *
 * @property id - 预设稳定 ID，供 show-message 槽位引用
 * @property characterId - 绑定的资产角色 ID
 * @property avatarSource - 头像来源策略
 * @property avatarAsset - `avatarSource === "asset"` 时解析出的素材 URI
 * @property showAvatar - 默认是否显示头像（可被方法块组级三态覆盖）
 * @property showName - 默认是否显示名称（可被方法块组级三态覆盖）
 * @property fontSize - 可选正文字号（已归一化，如 `14px`）
 * @property textColor - 可选正文色（已归一化 hex）
 * @property nameColor - 可选名称色（已归一化 hex）
 * @property bubbleColor - 可选气泡背景（hex 或已消毒 background）
 * @property customCss - 可选自定义 CSS 声明串（已消毒；优先于结构化字段）
 */
interface ChatRolePreset extends ChatRoleBubbleStyleFields {
  id: string;
  characterId: string;
  avatarSource: ChatRoleAvatarSource;
  avatarAsset?: string;
  showAvatar: boolean;
  showName: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, maxLength = 1024): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

function normalizeToastPosition(value: unknown): PhoneToastPosition {
  return (PHONE_TOAST_POSITIONS as readonly unknown[]).includes(value)
    ? (value as PhoneToastPosition)
    : "top-center";
}

function normalizeToastAnimationIn(value: unknown): PhoneToastAnimationIn {
  if ((PHONE_TOAST_ANIMATIONS_IN as readonly unknown[]).includes(value)) {
    return value as PhoneToastAnimationIn;
  }
  // 兼容旧剧情块保存的无后缀动画值。
  if (value === "fade" || value === "scale" || value === "slide" || value === "bounce") {
    return `${value}-in` as PhoneToastAnimationIn;
  }
  return "slide-in";
}

function normalizeToastAnimationOut(value: unknown): PhoneToastAnimationOut {
  if ((PHONE_TOAST_ANIMATIONS_OUT as readonly unknown[]).includes(value)) {
    return value as PhoneToastAnimationOut;
  }
  // 兼容旧剧情块保存的无后缀动画值。
  if (value === "fade" || value === "scale" || value === "slide" || value === "bounce") {
    return `${value}-out` as PhoneToastAnimationOut;
  }
  return "slide-out";
}

function normalizeToastStackDirection(
  value: unknown,
): PhoneToastStackDirection {
  return (PHONE_TOAST_STACK_DIRECTIONS as readonly unknown[]).includes(value)
    ? (value as PhoneToastStackDirection)
    : "below";
}

type AppAvailabilityField = "installed" | "enabled";

/** 当前上下文的作者应用目录；方法执行时用它验证 APP ID，绝不相信方法表单中的任意字符串。 */
function catalogFromPhoneSettings(ctx: ExtensionContext) {
  return catalogFromSettingsRows(
    ctx.settings.get<unknown[]>("catalogActions"),
    ctx.settings.get<unknown[]>("catalogApps"),
    ctx.settings.get<string>("appCatalogJson"),
    {
      programUiActions: ctx.settings.get<unknown[]>("programUiActions"),
      visualUiActions: ctx.settings.get<unknown[]>("visualUiActions"),
      systemSlotActions: ctx.settings.get<unknown[]>("systemSlotActions"),
      internalMethodActions: ctx.settings.get<unknown[]>(
        "internalMethodActions",
      ),
      inPhoneAppActions: ctx.settings.get<unknown[]>("inPhoneAppActions"),
    },
  );
}

/** 静态 schema 不支持动态多选，故为一个 APP 管理块提供固定的 1–8 号 ID 槽位。 */
function createAppAvailabilitySchema(
  operationOptions: Array<{ label: string; value: string }>,
) {
  return {
    operation: {
      type: "enum",
      label: "操作",
      options: operationOptions,
      default: operationOptions[0]?.value ?? "",
      required: true,
    } as const,
    showNotification: {
      type: "boolean",
      label: "显示 Toast 通知",
      default: false,
      description: "执行此剧情方法时向玩家显示操作结果；不会阻塞剧情。",
    } as const,
    notificationPosition: {
      type: "enum",
      label: "Toast 位置",
      options: TOAST_POSITION_OPTIONS,
      default: "top-center",
      enabledWhen: "showNotification",
    } as const,
    notificationAnimation: {
      type: "enum",
      label: "Toast 入场动画",
      options: TOAST_ANIMATION_IN_OPTIONS,
      default: "slide-in",
      enabledWhen: "showNotification",
    } as const,
    notificationExitAnimation: {
      type: "enum",
      label: "Toast 退场动画",
      options: TOAST_ANIMATION_OUT_OPTIONS,
      default: "slide-out",
      enabledWhen: "showNotification",
    } as const,
    notificationStackDirection: {
      type: "enum",
      label: "后续 Toast 显示于",
      options: TOAST_STACK_DIRECTION_OPTIONS,
      default: "below",
      enabledWhen: "showNotification",
    } as const,

    ...Object.fromEntries(
      Array.from({ length: 8 }, (_, offset) => {
        const index = offset + 1;
        const suffix = index === 1 ? "" : String(index);
        return [
          [
            `appId${suffix}`,
            {
              type: "string",
              label: `第 ${index} 个 APP ID`,
              required: index === 1,
              suggestions: { key: "phone-app-id" },
            } as const,
          ],
        ];
      }).flat(),
    ),
  };
}

function collectAppIds(params: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (let index = 1; index <= 8; index += 1) {
    const suffix = index === 1 ? "" : String(index);
    const id = nonEmptyString(params[`appId${suffix}`], 64);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function updatePhoneAppAvailability(
  save: SaveAPI<PhoneSaveMap>,
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  field: AppAvailabilityField,
  value: boolean,
  operation: string,
  showToast = true,
): void {
  const methodId =
    field === "installed"
      ? "manage-installed-apps"
      : "manage-app-enabled-state";
  const catalog = catalogFromPhoneSettings(ctx);
  const knownIds = new Set(catalog.apps.map((app) => app.id));
  const requestedIds = collectAppIds(params);
  phoneDebug("app-management-request", {
    methodId,
    operation,
    field,
    value,
    requestedIds,
  });

  const existing = normalizePhoneAppAvailability(save.get("appAvailability"));
  const states = new Map(
    existing
      .filter((state) => knownIds.has(state.appId))
      .map((state) => [state.appId, state]),
  );
  const appliedIds: string[] = [];
  const ignoredIds: string[] = [];

  for (const appId of requestedIds) {
    if (!knownIds.has(appId)) {
      ignoredIds.push(appId);
      continue;
    }
    const nextState: PhoneAppAvailabilityOverride = {
      ...(states.get(appId) ?? {}),
      appId,
      [field]: value,
    };
    states.set(appId, nextState);
    appliedIds.push(appId);
  }

  const next = catalog.apps.flatMap((app) => {
    const state = states.get(app.id);
    return state ? [state] : [];
  });
  save.set("appAvailability", next);
  phoneDebug("app-availability-updated", {
    methodId,
    operation,
    field,
    value,
    requestedIds,
    appliedIds,
    ignoredIds,
    savedOverrideCount: next.length,
  });
  const appNamesById = new Map(catalog.apps.map((app) => [app.id, app.name]));
  if (showToast) {
    showAppAvailabilityToast(
      ctx,
      params,
      operation,
      appliedIds.map((appId) => appNamesById.get(appId) ?? appId),
    );
  }
}

function appAvailabilityToastMessage(
  operation: string,
  appliedIds: readonly string[],
): string {
  if (appliedIds.length === 0) return "未找到可操作的 APP";
  const subject =
    appliedIds.length === 1
      ? `APP「${appliedIds[0]}」`
      : `${appliedIds.length} 个 APP`;
  const action =
    operation === "remove"
      ? "已从手机删除"
      : operation === "disable"
        ? "已禁用"
        : operation === "enable"
          ? "已解禁"
          : "已添加到手机";
  return `${subject}${action}`;
}

function showAppAvailabilityToast(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  operation: string,
  appliedIds: readonly string[],
): void {
  if (params.showNotification !== true) return;

  const toast: PhoneToastData = {
    message: appAvailabilityToastMessage(operation, appliedIds),
    position: normalizeToastPosition(params.notificationPosition),
    animation: normalizeToastAnimationIn(params.notificationAnimation),
    exitAnimation: normalizeToastAnimationOut(params.notificationExitAnimation),
    stackDirection: normalizeToastStackDirection(
      params.notificationStackDirection,
    ),
  };
  const wasEmpty = enqueueToast(ctx, toast);
  if (!wasEmpty && ctx.ui.isVisible("phone-toast")) return;
  try {
    void Promise.resolve(
      ctx.ui.show("phone-toast", undefined, {
        size: "(100%, 100%)",
        position: "(0, 0)",
        interactable: false,
      }),
    ).catch((error: unknown) => {
      phoneDebug("app-notification-show-failed", { error: String(error) });
    });
  } catch (error) {
    phoneDebug("app-notification-show-failed", { error: String(error) });
  }
}

function normalizeChatAvatarAssets(
  value: unknown,
): ReadonlyMap<string, string> {
  const assets = new Map<string, string>();
  if (!Array.isArray(value)) return assets;

  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const id = nonEmptyString(raw.id, 80);
    const asset = nonEmptyString(raw.asset, 4096);
    if (id && asset && !assets.has(id)) assets.set(id, asset);
  }
  return assets;
}

function normalizeChatRolePresets(
  value: unknown,
  chatAvatarAssetRows: unknown,
): ReadonlyMap<string, ChatRolePreset> {
  const presets = new Map<string, ChatRolePreset>();
  const avatarAssets = normalizeChatAvatarAssets(chatAvatarAssetRows);
  if (!Array.isArray(value)) return presets;

  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const id = nonEmptyString(raw.id, 80);
    const characterId = nonEmptyString(raw.characterId, 160);
    if (!id || !characterId || presets.has(id)) continue;
    const avatarSource = (
      CHAT_ROLE_AVATAR_SOURCES as readonly unknown[]
    ).includes(raw.avatarSource)
      ? (raw.avatarSource as ChatRoleAvatarSource)
      : "first-portrait";
    const avatarAssetId = nonEmptyString(raw.avatarAssetId, 80);
    // avatarAsset 是旧版同表字段；保留读取以便已有项目迁移后仍可显示头像。
    const legacyAvatarAsset = nonEmptyString(raw.avatarAsset, 4096);
    const avatarAsset =
      avatarSource === "asset"
        ? ((avatarAssetId ? avatarAssets.get(avatarAssetId) : undefined) ??
          legacyAvatarAsset)
        : undefined;
    /**
     * 气泡样式：非法字段在 normalizeChatRoleBubbleStyle 内静默丢弃；
     * 仅展开合法键，避免把空对象写进预设。
     */
    const bubbleStyle = normalizeChatRoleBubbleStyle(raw);

    presets.set(id, {
      id,
      characterId,
      avatarSource,
      ...(avatarAsset ? { avatarAsset } : {}),
      // 旧项目缺字段时视为显示，仅严格 false 才隐藏。
      showAvatar: normalizePresetVisibilityFlag(raw.showAvatar),
      showName: normalizePresetVisibilityFlag(raw.showName),
      ...bubbleStyle,
    });
  }
  return presets;
}

function normalizeMessageStatus(
  value: unknown,
  direction: PhoneMessageDirection,
): PhoneMessageStatus {
  // 对方消息固定已读；我方消息未指定或非法时也默认显示已读。
  if (direction === "incoming") return "read";
  return (OUTGOING_MESSAGE_STATUSES as readonly unknown[]).includes(value)
    ? (value as PhoneMessageStatus)
    : "read";
}

function normalizeStoryPopupPosition(value: unknown): PhonePopupPosition {
  return (PHONE_POPUP_POSITIONS as readonly unknown[]).includes(value)
    ? (value as PhonePopupPosition)
    : "bottom-right";
}

export interface PhoneStoryMessage {
  /** 预设在方法开始时展开的资产角色稳定 ID。 */
  characterId: string;
  /** 已展开的聊天角色预设 ID，仅用于诊断和保留消息快照来源。 */
  chatRoleId: string;
  /** 当前预设要求优先使用的头像来源。 */
  avatarSource: ChatRoleAvatarSource;
  /** `avatarSource === "asset"` 时的新扩展素材 URI。 */
  avatarAsset?: string;
  /** 兼容旧消息快照中的角色立绘引用。 */
  portraitId?: string;
  message: string;
  direction: PhoneMessageDirection;
  status: PhoneMessageStatus;
  /** 仅在 `status === "blocked"` 时显示。 */
  blockedHint?: string;
  /** 最终是否渲染头像（已合并方法覆盖）。 */
  showAvatar: boolean;
  /** 最终是否渲染名称（已合并方法覆盖）。 */
  showName: boolean;
  /**
   * 可选正文字号（快照自预设；已归一化，如 `14px`）。
   * 未填则 UI 使用默认样式。
   */
  fontSize?: string;
  /**
   * 可选正文文字色（快照自预设；已归一化 hex）。
   * 未填则 UI 使用默认样式。
   */
  textColor?: string;
  /**
   * 可选名称（strong）文字色（快照自预设；已归一化 hex）。
   * 未填则 UI 使用默认样式。
   */
  nameColor?: string;
  /**
   * 可选气泡背景（快照自预设；hex 或已消毒 background）。
   * 未填则 UI 使用默认 incoming/outgoing 背景。
   */
  bubbleColor?: string;
  /**
   * 可选自定义 CSS 声明串（快照自预设；已消毒）。
   * 优先级高于结构化样式字段；未填则不追加。
   */
  customCss?: string;
}

type PhoneStoryMessageListener = (
  messages: readonly PhoneStoryMessage[],
  awaitingAdvance: boolean,
  popupPosition: PhonePopupPosition,
  storyBackground?: string,
) => void;

export type PhoneStoryAdvanceResult = "appended" | "finished" | "close" | false;

export interface PhoneUIProps extends ExtensionProps {
  loadPreferences: () => readonly PlayerPhonePreferences[];
  savePreferences: (value: readonly PlayerPhonePreferences[]) => void;
  /** 剧情控制的已安装/可用覆盖；独立于玩家个性化设置。 */
  loadAppAvailability: () => readonly PhoneAppAvailabilityOverride[];
  /** 读取当前运行时挂载状态；UI 在异步关闭后据此阻止继续启动动作。 */
  isPhoneMounted: () => boolean;
  closePhone: () => void;
  storyMessages?: readonly PhoneStoryMessage[];
  storyPopupPosition?: PhonePopupPosition;
  /** 当前剧情消息组的可选屏幕背景素材；空值回退普通手机背景。 */
  storyBackground?: string;
  subscribeStoryMessages?: (listener: PhoneStoryMessageListener) => () => void;
  advanceStoryMessage?: () => PhoneStoryAdvanceResult;
}

interface PendingStorySequence {
  readonly debugId: number;
  readonly key: string;
  readonly messages: readonly PhoneStoryMessage[];
  nextIndex: number;
  readonly closeAfterMessages: boolean;
  readonly promise: Promise<void>;
  readonly resolve: () => void;
}

interface PhoneRuntime {
  readonly debugScopeId: number;
  activeStoryMessages: readonly PhoneStoryMessage[];
  activeStoryPopupPosition: PhonePopupPosition;
  /** 当前剧情消息组的背景，不写入 shared 存档。 */
  activeStoryBackground: string | undefined;
  storyMessageSessionVisible: boolean;
  pendingStorySequence: PendingStorySequence | undefined;
  readonly storyMessageListeners: Set<PhoneStoryMessageListener>;
  phoneMounted: boolean;
  phoneMountEpoch: number;
  opening: boolean;
  toastSequence: number;
  toastTimer: number | undefined;
}

/**
 * Studio 的多个 Preview 可复用同一扩展 bundle。运行时状态必须按宿主上下文分区，
 * 不能保存在模块级变量中，否则一个 Preview 的 pending Promise 会阻塞另一个 Preview。
 */
const phoneRuntimes = new WeakMap<object, PhoneRuntime>();
let nextPhoneRuntimeDebugScopeId = 1;

type RuntimeKeySource =
  | "flow.signal"
  | "host"
  | "ui"
  | "ui.show"
  | "ui.hide"
  | "ui.isVisible"
  | "context";
interface RuntimeKeyCandidate {
  readonly source: RuntimeKeySource;
  readonly key: object;
}

function isRuntimeKey(value: unknown): value is object {
  return (
    value !== null && (typeof value === "object" || typeof value === "function")
  );
}

/**
 * Method、注册回调和 React render 会获得不同的 Context/host 包装对象。
 * `ui` 及其回调由具体 Preview 的 UI 容器实现，作为主锚点；同时把所有可用身份映射到同一 runtime，
 * 使后续任一路径只要共享其中一个宿主对象即可命中。settings 等项目级共享 API 不可作 key，以免串 Preview。
 */
function collectPhoneRuntimeKeys(
  ctx: ExtensionContext,
): readonly RuntimeKeyCandidate[] {
  const candidates: RuntimeKeyCandidate[] = [];
  const add = (source: RuntimeKeySource, value: unknown) => {
    if (
      !isRuntimeKey(value) ||
      candidates.some((candidate) => candidate.key === value)
    )
      return;
    candidates.push({ source, key: value });
  };

  // 运行周期的 AbortSignal 在同一次 Preview 剧本执行中保持稳定，softReset/destroy 时才会更换。
  add("flow.signal", ctx.flow.signal);
  try {
    add("host", ctx.getHost());
  } catch (error) {
    console.warn("[phone] 无法读取运行时宿主", error);
  }
  add("ui", ctx.ui);
  add("ui.show", ctx.ui.show);
  add("ui.hide", ctx.ui.hide);
  add("ui.isVisible", ctx.ui.isVisible);
  add("context", ctx);
  return candidates;
}

function bindPhoneRuntimeKeys(
  runtime: PhoneRuntime,
  candidates: readonly RuntimeKeyCandidate[],
): void {
  for (const candidate of candidates) phoneRuntimes.set(candidate.key, runtime);
}

function getPhoneRuntime(ctx: ExtensionContext): PhoneRuntime {
  const candidates = collectPhoneRuntimeKeys(ctx);
  for (const candidate of candidates) {
    const existing = phoneRuntimes.get(candidate.key);
    if (!existing) continue;
    bindPhoneRuntimeKeys(existing, candidates);
    phoneDebug("runtime-resolved", {
      scopeId: existing.debugScopeId,
      matchedBy: candidate.source,
    });
    return existing;
  }

  const runtime: PhoneRuntime = {
    debugScopeId: nextPhoneRuntimeDebugScopeId++,
    activeStoryMessages: [],
    activeStoryPopupPosition: "bottom-right",
    activeStoryBackground: undefined,
    storyMessageSessionVisible: false,
    pendingStorySequence: undefined,
    storyMessageListeners: new Set<PhoneStoryMessageListener>(),
    phoneMounted: false,
    phoneMountEpoch: 0,
    opening: false,
    toastSequence: 0,
    toastTimer: undefined,
  };
  bindPhoneRuntimeKeys(runtime, candidates);
  phoneDebug("runtime-created", {
    scopeId: runtime.debugScopeId,
    keySources: candidates.map((candidate) => candidate.source),
  });
  return runtime;
}

function runtimeDebug(
  runtime: PhoneRuntime,
  event: string,
  details?: unknown,
): void {
  if (details === undefined) {
    phoneDebug(event, { scopeId: runtime.debugScopeId });
    return;
  }
  phoneDebug(
    event,
    isRecord(details)
      ? { scopeId: runtime.debugScopeId, ...details }
      : { scopeId: runtime.debugScopeId, details },
  );
}

function isCurrentPhoneMount(runtime: PhoneRuntime, epoch: number): boolean {
  return runtime.phoneMounted && epoch === runtime.phoneMountEpoch;
}

function publishStoryMessages(runtime: PhoneRuntime): void {
  const awaitingAdvance = runtime.pendingStorySequence !== undefined;
  runtimeDebug(runtime, "sequence-publish", {
    sequenceId: runtime.pendingStorySequence?.debugId ?? null,
    awaitingAdvance,
    messageCount: runtime.activeStoryMessages.length,
    nextIndex: runtime.pendingStorySequence?.nextIndex ?? null,
    totalCount: runtime.pendingStorySequence?.messages.length ?? null,
    popupPosition: runtime.activeStoryPopupPosition,
    hasStoryBackground: Boolean(runtime.activeStoryBackground),
    listenerCount: runtime.storyMessageListeners.size,
  });
  for (const listener of runtime.storyMessageListeners) {
    listener(
      runtime.activeStoryMessages,
      awaitingAdvance,
      runtime.activeStoryPopupPosition,
      runtime.activeStoryBackground,
    );
  }
}

/** 启用一个 Preview 的手机能力；不自动打开 UI，也不改动任何存档数据。 */
function activatePhoneRuntime(runtime: PhoneRuntime): void {
  if (runtime.phoneMounted) return;
  runtime.phoneMounted = true;
  runtime.phoneMountEpoch += 1;
  runtimeDebug(runtime, "phone-mounted", { epoch: runtime.phoneMountEpoch });
}

/** 立即让当前 Preview 的手机入口失效，并清理其临时消息会话。 */
async function deactivatePhoneRuntime(
  ctx: ExtensionContext,
  runtime: PhoneRuntime,
): Promise<void> {
  runtime.phoneMounted = false;
  runtime.phoneMountEpoch += 1;
  runtime.opening = false;
  runtime.toastSequence += 1;
  if (runtime.toastTimer !== undefined) {
    globalThis.clearTimeout(runtime.toastTimer);
    runtime.toastTimer = undefined;
  }
  try {
    await ctx.ui.hide("phone-toast");
  } catch (error) {
    phoneDebug("app-notification-hide-failed", { error: String(error) });
  }

  const pending = runtime.pendingStorySequence;
  runtime.pendingStorySequence = undefined;
  runtime.storyMessageSessionVisible = false;
  runtime.activeStoryMessages = [];
  runtime.activeStoryPopupPosition = "bottom-right";
  runtime.activeStoryBackground = undefined;
  publishStoryMessages(runtime);
  pending?.resolve();

  runtimeDebug(runtime, "phone-unmounted", {
    epoch: runtime.phoneMountEpoch,
    hadPendingSequence: Boolean(pending),
  });
  if (!ctx.ui.isVisible("phone")) return;
  try {
    await ctx.ui.hide("phone");
  } catch (error) {
    console.error("[phone] 卸载时关闭手机失败", error);
  }
}

function subscribeStoryMessages(
  runtime: PhoneRuntime,
  listener: PhoneStoryMessageListener,
): () => void {
  runtime.storyMessageListeners.add(listener);
  runtimeDebug(runtime, "listener-subscribe", {
    listenerCount: runtime.storyMessageListeners.size,
  });
  listener(
    runtime.activeStoryMessages,
    runtime.pendingStorySequence !== undefined,
    runtime.activeStoryPopupPosition,
    runtime.activeStoryBackground,
  );
  return () => {
    runtime.storyMessageListeners.delete(listener);
    runtimeDebug(runtime, "listener-unsubscribe", {
      listenerCount: runtime.storyMessageListeners.size,
    });
  };
}

const STORY_UI_SUBSCRIPTION_TIMEOUT_MS = 320;

/** 等待当前 Preview 的 React 手机 UI 建立消息订阅。 */
async function waitForStoryMessageSubscriber(
  runtime: PhoneRuntime,
  timeoutMs = STORY_UI_SUBSCRIPTION_TIMEOUT_MS,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (runtime.storyMessageListeners.size === 0 && Date.now() < deadline) {
    await new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, 16);
    });
  }
  return runtime.storyMessageListeners.size > 0;
}

/** 以单次受控重试挂载当前 Preview 的消息手机。 */
async function showStoryMessageUi(
  ctx: ExtensionContext,
  runtime: PhoneRuntime,
  storyMessages: readonly PhoneStoryMessage[],
  storyPopupPosition: PhonePopupPosition,
  storyBackground: string | undefined,
  sequenceId: number,
): Promise<void> {
  const show = () =>
    ctx.ui.show(
      "phone",
      {
        storyMessages,
        storyPopupPosition,
        ...(storyBackground ? { storyBackground } : {}),
      },
      {
        size: "(100%, 100%)",
        position: "(0, 0)",
        interactable: true,
      },
    );

  await show();
  if (await waitForStoryMessageSubscriber(runtime)) return;

  runtimeDebug(runtime, "ui-show-no-subscriber", { sequenceId, attempt: 1 });
  await ctx.ui.hide("phone");
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });

  await show();
  if (await waitForStoryMessageSubscriber(runtime)) return;

  runtimeDebug(runtime, "ui-show-no-subscriber", { sequenceId, attempt: 2 });
  throw new Error("手机剧情消息界面未能完成挂载");
}

function finishStoryMessageSequence(
  runtime: PhoneRuntime,
  reason = "unspecified",
): boolean {
  const sequence = runtime.pendingStorySequence;
  if (!sequence) {
    runtimeDebug(runtime, "sequence-finish-ignored", {
      reason,
      pending: false,
    });
    return false;
  }

  runtimeDebug(runtime, "sequence-finish", {
    sequenceId: sequence.debugId,
    reason,
    nextIndex: sequence.nextIndex,
    totalCount: sequence.messages.length,
    visibleMessageCount: runtime.activeStoryMessages.length,
  });
  runtime.pendingStorySequence = undefined;
  publishStoryMessages(runtime);
  sequence.resolve();
  return true;
}

/** 推进当前 Preview 中的消息会话一次。 */
function advanceStoryMessage(runtime: PhoneRuntime): PhoneStoryAdvanceResult {
  const sequence = runtime.pendingStorySequence;
  if (!sequence) {
    runtimeDebug(runtime, "advance-ignored", { pending: false });
    return false;
  }

  runtimeDebug(runtime, "advance-received", {
    sequenceId: sequence.debugId,
    nextIndex: sequence.nextIndex,
    totalCount: sequence.messages.length,
    visibleMessageCount: runtime.activeStoryMessages.length,
    closeAfterMessages: sequence.closeAfterMessages,
  });

  const nextMessage = sequence.messages[sequence.nextIndex];
  if (nextMessage) {
    const appendedIndex = sequence.nextIndex;
    sequence.nextIndex += 1;
    runtime.activeStoryMessages = [...runtime.activeStoryMessages, nextMessage];
    runtimeDebug(runtime, "advance-appended", {
      sequenceId: sequence.debugId,
      appendedIndex,
      nextIndex: sequence.nextIndex,
      message: nextMessage,
      visibleMessageCount: runtime.activeStoryMessages.length,
    });
    publishStoryMessages(runtime);
    return "appended";
  }

  if (sequence.closeAfterMessages) {
    runtimeDebug(runtime, "advance-close-requested", {
      sequenceId: sequence.debugId,
      nextIndex: sequence.nextIndex,
      totalCount: sequence.messages.length,
    });
    return "close";
  }
  finishStoryMessageSequence(runtime, "group-finished-without-close");
  return "finished";
}

/**
 * 创建、接续或排队一组剧情手机消息。排队、订阅和 pending Promise 均严格限制在当前 Preview 的 runtime。
 */
async function showStoryMessages(
  ctx: ExtensionContext,
  runtime: PhoneRuntime,
  messages: readonly PhoneStoryMessage[],
  appendToExisting: boolean,
  closeAfterMessages: boolean,
  popupPosition: PhonePopupPosition,
  storyBackground: string | undefined,
): Promise<void> {
  const mountEpoch = runtime.phoneMountEpoch;
  if (!isCurrentPhoneMount(runtime, mountEpoch)) {
    runtimeDebug(runtime, "sequence-request-ignored-unmounted", {
      messageCount: messages.length,
    });
    return;
  }

  if (messages.length === 0) {
    runtimeDebug(runtime, "sequence-request-empty", {
      appendToExisting,
      closeAfterMessages,
    });
    return;
  }

  const sequenceKey = JSON.stringify({
    messages,
    appendToExisting,
    closeAfterMessages,
    popupPosition,
    storyBackground,
  });
  runtimeDebug(runtime, "sequence-request", {
    sequenceKey,
    messageCount: messages.length,
    messages,
    appendToExisting,
    closeAfterMessages,
    popupPosition,
    hasStoryBackground: Boolean(storyBackground),
    existingSequenceId: runtime.pendingStorySequence?.debugId ?? null,
    uiVisible: ctx.ui.isVisible("phone"),
    storyMessageSessionVisible: runtime.storyMessageSessionVisible,
  });
  while (runtime.pendingStorySequence) {
    const pending = runtime.pendingStorySequence;
    const uiAttached =
      ctx.ui.isVisible("phone") || runtime.storyMessageListeners.size > 0;

    if (!uiAttached) {
      runtimeDebug(runtime, "sequence-request-recover-stale", {
        staleSequenceId: pending.debugId,
        sameSequenceKey: pending.key === sequenceKey,
        uiVisible: ctx.ui.isVisible("phone"),
        listenerCount: runtime.storyMessageListeners.size,
      });
      runtime.pendingStorySequence = undefined;
      runtime.storyMessageSessionVisible = false;
      runtime.activeStoryMessages = [];
      runtime.activeStoryPopupPosition = "bottom-right";
      runtime.activeStoryBackground = undefined;
      publishStoryMessages(runtime);
      pending.resolve();
      continue;
    }

    if (pending.key === sequenceKey) {
      runtimeDebug(runtime, "sequence-request-reused", {
        sequenceId: pending.debugId,
        sequenceKey,
      });
      return pending.promise;
    }
    runtimeDebug(runtime, "sequence-request-queued", {
      waitingForSequenceId: pending.debugId,
      nextSequenceKey: sequenceKey,
    });
    await pending.promise;
  }

  if (!isCurrentPhoneMount(runtime, mountEpoch)) {
    runtimeDebug(runtime, "sequence-request-cancelled-unmounted", {
      stage: "after-queue",
    });
    return;
  }

  const uiVisible = ctx.ui.isVisible("phone");
  const hasStorySession = runtime.storyMessageSessionVisible;
  const shouldCreateStoryUi = !hasStorySession;
  const continuingSession =
    appendToExisting && runtime.activeStoryMessages.length > 0;
  if (!hasStorySession && uiVisible) await ctx.ui.hide("phone");
  if (!isCurrentPhoneMount(runtime, mountEpoch)) {
    runtimeDebug(runtime, "sequence-request-cancelled-unmounted", {
      stage: "after-hide",
    });
    return;
  }

  runtime.activeStoryPopupPosition = popupPosition;
  // 每个方法块都决定本组会话背景；未设置时清空上组背景并回退普通手机背景。
  runtime.activeStoryBackground = storyBackground;
  runtime.activeStoryMessages = continuingSession
    ? [...runtime.activeStoryMessages, messages[0]]
    : [messages[0]];
  const debugId = nextStorySequenceDebugId++;
  let resolveSequence!: () => void;
  const sequencePromise = new Promise<void>((resolve) => {
    resolveSequence = resolve;
  });
  runtime.pendingStorySequence = {
    debugId,
    key: sequenceKey,
    messages,
    nextIndex: 1,
    closeAfterMessages,
    promise: sequencePromise,
    resolve: resolveSequence,
  };
  runtimeDebug(runtime, "sequence-created", {
    sequenceId: debugId,
    uiVisible,
    hasStorySession,
    continuingSession,
    appendToExisting,
    closeAfterMessages,
    popupPosition,
    hasStoryBackground: Boolean(storyBackground),
    activeMessageCount: runtime.activeStoryMessages.length,
    totalCount: messages.length,
    messages,
  });
  publishStoryMessages(runtime);

  try {
    if (shouldCreateStoryUi) {
      runtime.storyMessageSessionVisible = true;
      runtimeDebug(runtime, "ui-show-start", {
        sequenceId: debugId,
        activeMessageCount: runtime.activeStoryMessages.length,
        reportedUiVisible: uiVisible,
      });
      await showStoryMessageUi(
        ctx,
        runtime,
        runtime.activeStoryMessages,
        runtime.activeStoryPopupPosition,
        runtime.activeStoryBackground,
        debugId,
      );
      if (!isCurrentPhoneMount(runtime, mountEpoch)) {
        runtimeDebug(runtime, "sequence-request-cancelled-unmounted", {
          stage: "after-show",
        });
        if (ctx.ui.isVisible("phone")) await ctx.ui.hide("phone");
        return;
      }
      runtimeDebug(runtime, "ui-show-complete", { sequenceId: debugId });
    } else {
      runtimeDebug(runtime, "ui-show-reused", {
        sequenceId: debugId,
        reportedUiVisible: uiVisible,
      });
    }

    runtimeDebug(runtime, "sequence-await-start", { sequenceId: debugId });
    await sequencePromise;
    runtimeDebug(runtime, "sequence-await-resolved", { sequenceId: debugId });
  } catch (error) {
    runtimeDebug(runtime, "sequence-error", {
      sequenceId: debugId,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    runtime.storyMessageSessionVisible = false;
    finishStoryMessageSequence(runtime, "show-or-wait-error");
    throw error;
  } finally {
    const stillOwnsPending =
      runtime.pendingStorySequence?.resolve === resolveSequence;
    runtimeDebug(runtime, "sequence-finally", {
      sequenceId: debugId,
      stillOwnsPending,
    });
    if (stillOwnsPending) {
      runtime.pendingStorySequence = undefined;
      publishStoryMessages(runtime);
    }
  }
}

/**
 * 从 Studio method 参数的 1–8 号槽位构造可显示消息。
 * 文本会 trim，空文本直接跳过；第 2–8 条未选角色时继承第 1 条角色，未选方向默认为 incoming；
 * `portraitId` 保持为 characterPortrait 选择器给出的稳定立绘 ID。该函数只做容错归一化，不启动 UI。
 */
function collectStoryMessages(
  params: Record<string, unknown>,
  chatRolePresetRows: unknown,
  chatAvatarAssetRows: unknown,
): PhoneStoryMessage[] {
  const presets = normalizeChatRolePresets(
    chatRolePresetRows,
    chatAvatarAssetRows,
  );
  const slots = Array.from({ length: 8 }, (_, offset) => {
    const index = offset + 1;
    const suffix = index === 1 ? "" : String(index);
    return {
      index,
      presetId: params[`presetId${suffix}`],
      message: params[`message${suffix}`],
      direction: params[`direction${suffix}`],
      status: params[`status${suffix}`],
    };
  });
    /**
     * 组级三态（整块共用）：inherit → 各条跟随预设；show/hide → 本组强制显示或隐藏。
     */
    const groupShowAvatarOverride = params.showAvatar;
    const groupShowNameOverride = params.showName;
  phoneDebug("method-params", {
    keys: Object.keys(params),
    slots,
    groupShowAvatar: groupShowAvatarOverride,
    groupShowName: groupShowNameOverride,
    availableChatRoleIds: [...presets.keys()],
  });

  const messages: PhoneStoryMessage[] = [];
  const defaultPresetId = nonEmptyString(params.presetId, 80);

  for (let index = 1; index <= 8; index += 1) {
    const suffix = index === 1 ? "" : String(index);
    const rawMessage = params[`message${suffix}`];
    if (typeof rawMessage !== "string" || rawMessage.trim() === "") continue;

    const presetId =
      nonEmptyString(params[`presetId${suffix}`], 80) ?? defaultPresetId;
    const preset = presetId ? presets.get(presetId) : undefined;
    if (!preset) {
      phoneDebug("message-skipped-invalid-chat-role", { index, presetId });
      continue;
    }

    const direction: PhoneMessageDirection =
      params[`direction${suffix}`] === "outgoing" ? "outgoing" : "incoming";
    const status = normalizeMessageStatus(params[`status${suffix}`], direction);
    const blockedHint =
      status === "blocked"
        ? (nonEmptyString(params[`blockedHint${suffix}`], 240) ??
          DEFAULT_BLOCKED_HINT)
        : undefined;
    /**
     * 方法组级三态优先于预设：
     * - inherit / 缺失 → 该条跟随自身预设
     * - show / hide → 本组强制显示或隐藏
     */
    const showAvatar = resolveStoryVisibility(
      groupShowAvatarOverride,
      preset.showAvatar,
    );
    const showName = resolveStoryVisibility(
      groupShowNameOverride,
      preset.showName,
    );
    /**
     * 样式打进快照：播放期不随 settings 热改。
     * 仅拷贝预设上已存在的合法字段（未填则省略，UI 走默认）。
     */
    const bubbleStyle: ChatRoleBubbleStyleFields = {
      ...(preset.fontSize ? { fontSize: preset.fontSize } : {}),
      ...(preset.textColor ? { textColor: preset.textColor } : {}),
      ...(preset.nameColor ? { nameColor: preset.nameColor } : {}),
      ...(preset.bubbleColor ? { bubbleColor: preset.bubbleColor } : {}),
      ...(preset.customCss ? { customCss: preset.customCss } : {}),
    };

    messages.push({
      characterId: preset.characterId,
      chatRoleId: preset.id,
      avatarSource: preset.avatarSource,
      ...(preset.avatarAsset ? { avatarAsset: preset.avatarAsset } : {}),
      message: rawMessage.trim(),
      direction,
      status,
      ...(blockedHint ? { blockedHint } : {}),
      showAvatar,
      showName,
      ...bubbleStyle,
    });
  }

  phoneDebug("method-messages-parsed", {
    messageCount: messages.length,
    messages,
  });
  return messages;
}

/**
 * Schema 只能使用静态字段，当前 SDK 不支持从扩展设置的数组动态生成下拉项。
 * 因此消息块保存聊天角色预设的稳定 ID，并在执行时解析为不可变消息快照。
 */
function createStoryMessageSchema() {
  const directionOptions = [
    { label: "对方发消息", value: "incoming" },
    { label: "我方发消息", value: "outgoing" },
  ] as const;
  const statusOptions = [
    { label: "发送中（仅我方）", value: "sending" },
    { label: "未读（仅我方）", value: "unread" },
    { label: "已读", value: "read" },
    { label: "发送失败（仅我方）", value: "failed" },
    { label: "被拉黑（仅我方）", value: "blocked" },
  ] as const;

  return {
    appendToExisting: {
      type: "boolean",
      label: "接续上一组消息",
      default: false,
    } as const,
    closeAfterMessages: {
      type: "boolean",
      label: "本组结束后关闭手机",
      default: true,
    } as const,
    popupPosition: {
      type: "enum",
      label: "手机消息显示位置",
      options: [
        { label: "左上", value: "top-left" },
        { label: "中上", value: "top-center" },
        { label: "右上", value: "top-right" },
        { label: "左下", value: "bottom-left" },
        { label: "中下", value: "bottom-center" },
        { label: "右下", value: "bottom-right" },
        { label: "中部", value: "center" },
      ],
      default: "bottom-right",
      required: true,
    } as const,
    storyBackground: {
      type: "asset",
      label: "聊天手机背景图（可选）",
      assetType: "image",
    } as const,
    /**
     * 组级三态枚举：默认「跟随预设」。
     * 作用于本方法块全部消息；不对第 1～8 条分别配置。
     */
    showAvatar: {
      type: "enum",
      label: "显示头像",
      options: [
        { label: "跟随预设", value: STORY_VISIBILITY_OVERRIDES[0] },
        { label: "显示", value: STORY_VISIBILITY_OVERRIDES[1] },
        { label: "隐藏", value: STORY_VISIBILITY_OVERRIDES[2] },
      ],
      default: "inherit",
      required: true,
    } as const,
    showName: {
      type: "enum",
      label: "显示名称",
      options: [
        { label: "跟随预设", value: STORY_VISIBILITY_OVERRIDES[0] },
        { label: "显示", value: STORY_VISIBILITY_OVERRIDES[1] },
        { label: "隐藏", value: STORY_VISIBILITY_OVERRIDES[2] },
      ],
      default: "inherit",
      required: true,
    } as const,
    ...Object.fromEntries(
      Array.from({ length: 8 }, (_, offset) => {
        const index = offset + 1;
        const suffix = index === 1 ? "" : String(index);
        const required = index === 1;
        return [
          [
            `presetId${suffix}`,
            {
              type: "string",
              label: `第 ${index} 条 · 聊天角色预设 ID`,
              required,
              suggestions: { key: "phone-chat-role-preset" },
            } as const,
          ],
          [
            `message${suffix}`,
            {
              type: "string",
              label: `第 ${index} 条 · 内容`,
              multiline: true,
              required,
            } as const,
          ],
          [
            `direction${suffix}`,
            {
              type: "enum",
              label: `第 ${index} 条 · 发送方`,
              options: directionOptions,
              default: "incoming",
              required,
            } as const,
          ],
          [
            `status${suffix}`,
            {
              type: "enum",
              label: `第 ${index} 条 · 消息状态`,
              options: statusOptions,
              default: "read",
              required,
            } as const,
          ],
          [
            `blockedHint${suffix}`,
            {
              type: "string",
              label: `第 ${index} 条 · 被拉黑提示文本`,
              multiline: true,
            } as const,
          ],
        ];
      }).flat(),
    ),
  };
}

/**
 * Studio 的“手机”程序扩展。
 *
 * 它同时声明项目设置、shared 玩家偏好存档、打开手机的语义快捷键，以及供 Fragment 调用的
 * `show-message` 方法。剧情消息状态保持在模块级，以便宿主短暂重建 React UI 时仍能接续同一序列。
 * 对外运行时 UI ID 固定为 `phone`，不得随重构修改。
 */
@extension({ id: "phone", label: "手机", category: "游戏系统" })
export class PhoneExtension extends Extension<PhoneUIProps> {
  /**
   * Fragment 方法：启用本次运行中的手机功能（method id: `mount-phone`）。
   * 挂载不会自动弹出手机，也不会重置玩家个性化、应用绑定或任何其他保存数据。
   */
  static mountPhone = method({
    id: "mount-phone",
    title: "挂载手机",
    description:
      "启用手机功能。挂载后可通过快捷键打开手机或调用“显示手机消息”。不会自动打开手机。",
    run(ctx) {
      activatePhoneRuntime(getPhoneRuntime(ctx));
    },
    runImmediately(ctx) {
      activatePhoneRuntime(getPhoneRuntime(ctx));
    },
    skip(ctx) {
      activatePhoneRuntime(getPhoneRuntime(ctx));
    },
  });

  /**
   * Fragment 方法：禁用本次运行中的手机功能（method id: `unmount-phone`）。
   * 会立即结束当前 Preview 等待中的消息序列并关闭其手机 UI，但不清除 shared preferences 或作者配置。
   */
  static unmountPhone = method({
    id: "unmount-phone",
    title: "卸载手机",
    description: "关闭并禁用手机功能，不删除玩家已保存的手机个性化与应用配置。",
    async run(ctx) {
      await deactivatePhoneRuntime(ctx, getPhoneRuntime(ctx));
    },
    async runImmediately(ctx) {
      await deactivatePhoneRuntime(ctx, getPhoneRuntime(ctx));
    },
    async skip(ctx) {
      await deactivatePhoneRuntime(ctx, getPhoneRuntime(ctx));
    },
  });

  /**
   * 剧情方法：把已配置 APP 安装到手机，或从手机删除。一次最多处理 8 个 APP ID。
   * 方法只修改玩家 shared APP 状态，不改作者应用目录；不存在的 ID 会安全忽略并写入调试日志。
   */
  static manageInstalledApps = method({
    id: "manage-installed-apps",
    title: "添加或删除手机 APP",
    description:
      "对已配置的 APP 执行添加到手机或从手机删除。每块最多填写 8 个 APP ID。",
    schema: createAppAvailabilitySchema([
      { label: "添加到手机", value: "install" },
      { label: "从手机删除", value: "remove" },
    ]),
    run(ctx, params) {
      const operation = params.operation === "remove" ? "remove" : "install";
      updatePhoneAppAvailability(
        this.save as unknown as SaveAPI<PhoneSaveMap>,
        ctx,
        params as Record<string, unknown>,
        "installed",
        operation === "install",
        operation,
      );
    },
    runImmediately(ctx, params) {
      const operation = params.operation === "remove" ? "remove" : "install";
      updatePhoneAppAvailability(
        this.save as unknown as SaveAPI<PhoneSaveMap>,
        ctx,
        params as Record<string, unknown>,
        "installed",
        operation === "install",
        operation,
        false,
      );
    },
    skip(ctx, params) {
      const operation = params.operation === "remove" ? "remove" : "install";
      updatePhoneAppAvailability(
        this.save as unknown as SaveAPI<PhoneSaveMap>,
        ctx,
        params as Record<string, unknown>,
        "installed",
        operation === "install",
        operation,
        false,
      );
    },
  });

  /** 剧情方法：禁用或解禁已配置 APP；禁用不等同删除，解禁后仍保留安装状态。 */
  static manageAppEnabledState = method({
    id: "manage-app-enabled-state",
    title: "禁用或解禁手机 APP",
    description: "对已配置的 APP 执行禁用或解禁。每块最多填写 8 个 APP ID。",
    schema: createAppAvailabilitySchema([
      { label: "禁用 APP", value: "disable" },
      { label: "解禁 APP", value: "enable" },
    ]),
    run(ctx, params) {
      const operation = params.operation === "disable" ? "disable" : "enable";
      updatePhoneAppAvailability(
        this.save as unknown as SaveAPI<PhoneSaveMap>,
        ctx,
        params as Record<string, unknown>,
        "enabled",
        operation === "enable",
        operation,
      );
    },
    runImmediately(ctx, params) {
      const operation = params.operation === "disable" ? "disable" : "enable";
      updatePhoneAppAvailability(
        this.save as unknown as SaveAPI<PhoneSaveMap>,
        ctx,
        params as Record<string, unknown>,
        "enabled",
        operation === "enable",
        operation,
        false,
      );
    },
    skip(ctx, params) {
      const operation = params.operation === "disable" ? "disable" : "enable";
      updatePhoneAppAvailability(
        this.save as unknown as SaveAPI<PhoneSaveMap>,
        ctx,
        params as Record<string, unknown>,
        "enabled",
        operation === "enable",
        operation,
        false,
      );
    },
  });

  /**
   * Studio Fragment 可调用的剧情消息方法（method id 固定为 `show-message`）。
   *
   * 一个块最多读取 8 条消息：空内容或无有效角色的槽位会跳过，后续消息缺少角色时继承第一条角色。
   * 首组默认重新创建列表；`appendToExisting` 仅在当前 Preview 的活动会话已有消息时追加到旧 UI。方法返回的 Promise 会等待
   * 玩家逐条推进：显示最后一条后，若 `closeAfterMessages` 为 true，需再点击一次由 UI 执行关闭动画。
   */
  static showMessage = method({
    id: "show-message",
    title: "显示手机消息",
    description:
      "每块最多 8 条。每条填写在扩展设置中定义的聊天角色预设 ID；最后一组显示完并确认后自动关闭手机。",
    schema: createStoryMessageSchema(),
    run(ctx, params) {
      return showStoryMessages(
        ctx,
        getPhoneRuntime(ctx),
        collectStoryMessages(
          params as Record<string, unknown>,
          ctx.settings.get<unknown[]>("chatRolePresets"),
          ctx.settings.get<unknown[]>("chatAvatarAssets"),
        ),
        params.appendToExisting === true,
        params.closeAfterMessages !== false,
        normalizeStoryPopupPosition(params.popupPosition),
        nonEmptyString(params.storyBackground),
      );
    },
    /** Studio 的即时执行路径不打开纯展示型消息 UI。 */
    runImmediately() {
      // Intentionally empty: 立即执行时跳过纯展示型剧情消息。
    },
    /** Ctrl 快进路径不打开纯展示型消息 UI。 */
    skip() {
      // Intentionally empty: 快进不弹出手机。
    },
  });

  static settings = settings((s) => ({
    phoneTitle: s.string("手机标题").default("手机"),
    openPhoneShortcut: s
      .shortcut("打开手机快捷键")
      .default(DEFAULT_OPEN_PHONE_SHORTCUT)
      .describe(
        "普通手机未显示时用于打开手机的默认按键，例如 ArrowUp、KeyP 或 Ctrl+KeyP。消息手机显示时不会触发打开。",
      ),
    phoneStylePreset: s
      .enum("手机样式预设", ["apple", "android"] as const)
      .default("apple")
      .labels({
        apple: "苹果手机（iPhone）",
        android: "安卓手机（Android）",
      })
      .describe(
        "切换手机外壳、顶部开孔/听筒、圆角、应用气泡，以及打开/关闭手机内页应用的过渡动画（苹果：从图标放大；安卓：自下而上升起）。背景、强调色和外壳颜色仍使用下方作者设置。",
      ),
    popupPosition: s
      .enum("手机弹出位置", PHONE_POPUP_POSITIONS)
      .default("bottom-right")
      .labels({
        "top-left": "左上",
        "top-center": "中上",
        "top-right": "右上",
        "bottom-left": "左下",
        "bottom-center": "中下",
        "bottom-right": "右下",
        center: "中部",
      })
      .describe(
        "选择手机贴近视口的弹出位置；打开时从该方向滑入并淡入，关闭时反向滑出。",
      ),
    chatAvatarAssets: s
      .array("聊天头像素材库", (item) => ({
        id: item.string("素材 ID").default("new-chat-avatar"),
        asset: item.asset("头像素材").accepts("image"),
      }))
      .itemDefault({ id: "new-chat-avatar" })
      .maxItems(80)
      .addLabel("添加头像素材")
      .emptyHint("仅在聊天角色使用“新扩展素材”头像时添加。")
      .describe(
        "自定义头像集中在此处选择，避免素材预览撑高聊天角色预设表格。记录素材 ID 后，将它填入对应角色预设的“头像素材 ID”。",
      ),
    chatRolePresets: s
      .array("聊天角色预设", (item) => ({
        id: item.string("预设 ID").default("new-chat-role"),
        characterId: item.character("资产角色"),
        avatarSource: item
          .enum("头像来源", CHAT_ROLE_AVATAR_SOURCES)
          .default("first-portrait")
          .labels({
            "first-portrait": "第一张立绘（默认）",
            "character-avatar": "角色默认头像",
            asset: "扩展素材库",
          }),
        avatarAssetId: item.string("头像素材 ID").default(""),
        showAvatar: item.boolean("显示头像").default(true),
        showName: item.boolean("显示名称").default(true),
        fontSize: item
          .string("字体大小")
          .default(DEFAULT_CHAT_ROLE_FONT_SIZE)
          .describe("对应气泡正文默认字号；清空后回退样式表默认。"),
        textColor: item
          .string("文字颜色")
          .default(DEFAULT_CHAT_ROLE_TEXT_COLOR)
          .describe("正文色，支持 hex 或 rgba()；清空后回退样式表默认。"),
        nameColor: item
          .string("名称颜色")
          .default(DEFAULT_CHAT_ROLE_NAME_COLOR)
          .describe("名称色，支持 hex 或 rgba()；清空后回退样式表默认。"),
        bubbleColor: item
          .string("对话框颜色")
          .default(DEFAULT_CHAT_ROLE_BUBBLE_COLOR)
          .describe(
            "气泡背景（对方消息默认值）。填写后我方消息也使用该背景，不再使用强调色混合。清空后回退样式表默认。",
          ),
        customCss: item
          .string("自定义 CSS")
          .multiline()
          .default("")
          .describe(
            [
              "新建不预填；留空即用样式表默认。",
              "占位示例：",
              DEFAULT_CHAT_ROLE_CUSTOM_CSS,
              "。仅写声明列表（如 padding / border-radius），勿写选择器/花括号/url()。",
              "与上方结构化字段同时存在时，自定义 CSS 优先。",
            ].join(""),
          ),
      }))
      .itemDefault({
        id: "new-chat-role",
        avatarSource: "first-portrait",
        avatarAssetId: "",
        showAvatar: true,
        showName: true,
        fontSize: DEFAULT_CHAT_ROLE_FONT_SIZE,
        textColor: DEFAULT_CHAT_ROLE_TEXT_COLOR,
        nameColor: DEFAULT_CHAT_ROLE_NAME_COLOR,
        bubbleColor: DEFAULT_CHAT_ROLE_BUBBLE_COLOR,
        customCss: "",
      })
      .maxItems(80)
      .addLabel("添加聊天角色预设")
      .emptyHint("未配置聊天角色预设时，显示手机消息会跳过对应消息。")
      .describe(
        "每条预设绑定一个项目资产角色。消息块填写预设 ID。「显示头像 / 显示名称」默认开启。show-message 方法块另有两个组级枚举（跟随预设 / 显示 / 隐藏，默认跟随预设），作用于本组全部消息且优先于预设。气泡样式字号与颜色默认填入与手机 CSS 一致的值；自定义 CSS 新建为空（示例见字段说明），填写后优先于结构化颜色与字号。清空任一字段即该字段回退样式表默认（含对方/我方气泡差异）。样式在 show-message 展开时写入消息快照。只有选择“扩展素材库”时，才需要填写上方素材库的素材 ID。",
      ),
    programUiActions: s
      .array("动作 · 程序 UI", (item) => ({
        id: item.string("ID").default("new-program-ui"),
        name: item.string("名称").default("新程序界面"),
        programUiRef: item
          .string("UI 引用")
          .describe("本扩展填 ui-id；跨扩展填 extension-id/ui-id，不要加 @。"),
        description: item.string("说明"),
      }))
      .itemDefault({
        id: "new-program-ui",
        name: "新程序界面",
        programUiRef: "",
        description: "",
      })
      .maxItems(40)
      .addLabel("添加程序 UI 动作")
      .emptyHint("没有程序 UI 动作。")
      .describe(
        "操作：①点击“添加程序 UI 动作”；②填写唯一 ID 和名称；③本扩展 UI 填 ui-id，跨扩展填 extension-id/ui-id（不要加 @）；④在“手机应用目录”的默认动作 ID 中填写同一 ID。",
      ),
    visualUiActions: s
      .array("动作 · 可视化 UI", (item) => ({
        id: item.string("ID").default("new-visual-ui"),
        name: item.string("名称").default("新可视化界面"),
        visualUiName: item
          .string("界面名称")
          .describe("项目界面填 ui-name；扩展界面填 @extension-id/ui-name。"),
        modal: item.boolean("模态").default(true),
        description: item.string("说明"),
      }))
      .itemDefault({
        id: "new-visual-ui",
        name: "新可视化界面",
        visualUiName: "",
        modal: true,
        description: "",
      })
      .maxItems(40)
      .addLabel("添加可视化 UI 动作")
      .emptyHint("没有可视化 UI 动作。")
      .describe(
        "操作：①点击“添加可视化 UI 动作”；②填写唯一 ID 和名称；③项目界面填 ui-name，扩展界面填 @extension-id/ui-name；④按需开启模态；⑤在应用目录中绑定该 ID。",
      ),
    systemSlotActions: s
      .array("动作 · 内置系统界面", (item) => ({
        id: item.string("ID").default("new-system-ui"),
        name: item.string("名称").default("新系统界面"),
        systemSlot: item
          .enum("系统界面", SYSTEM_SLOT_IDS)
          .default(INTERNAL_SYSTEM_SLOT.Settings)
          .labels({
            [INTERNAL_SYSTEM_SLOT.Title]: "标题画面",
            [INTERNAL_SYSTEM_SLOT.Toolbar]: "对话工具栏",
            [INTERNAL_SYSTEM_SLOT.Save]: "存档界面",
            [INTERNAL_SYSTEM_SLOT.Load]: "读档界面",
            [INTERNAL_SYSTEM_SLOT.Settings]: "设置界面",
            [INTERNAL_SYSTEM_SLOT.History]: "历史记录",
            [INTERNAL_SYSTEM_SLOT.Gallery]: "鉴赏界面",
          }),
        description: item.string("说明"),
      }))
      .itemDefault({
        id: "new-system-ui",
        name: "新系统界面",
        systemSlot: INTERNAL_SYSTEM_SLOT.Settings,
        description: "",
      })
      .maxItems(40)
      .addLabel("添加系统界面动作")
      .emptyHint("没有额外的系统界面动作。")
      .describe(
        "操作：①点击“添加系统界面动作”；②填写唯一 ID 和名称；③从下拉框选择标题、存档、读档、设置、历史或鉴赏界面；④在应用目录中绑定该 ID。",
      ),
    internalMethodActions: s
      .array("动作 · 手机内部方法", (item) => ({
        id: item.string("ID").default("new-internal-method"),
        name: item.string("名称").default("新内部方法"),
        commandId: item
          .enum("内部方法", LOCAL_COMMAND_IDS)
          .default("quick-save")
          .labels({
            "quick-save": "快速存档",
            "quick-load": "快速读档",
            "toggle-fullscreen": "切换全屏",
          }),
        description: item.string("说明"),
      }))
      .itemDefault({
        id: "new-internal-method",
        name: "新内部方法",
        commandId: "quick-save",
        description: "",
      })
      .maxItems(40)
      .addLabel("添加内部方法动作")
      .emptyHint("没有额外的手机内部方法动作。")
      .describe(
        "操作：①点击“添加内部方法动作”；②填写唯一 ID 和名称；③从下拉框选择快速存档、快速读档或切换全屏；④在应用目录中绑定该 ID。只能选择插件预注册的安全方法。",
      ),
    inPhoneAppActions: s
      .array("动作 · 手机内部应用", (item) => ({
        id: item.string("ID").default("new-in-phone-app"),
        name: item.string("名称").default("新手机内部应用"),
        phoneAppId: item
          .string("Phone SDK 应用 ID")
          .describe(
            "填写已通过 @ink-zenly/phone-sdk/plugin 注册的程序 ID（与 @extension({ id }) / registerPhoneApp({ id }) 一致），例如 phone-snake。也可填「扩展ID/程序ID」。宿主本身不提供内页应用。",
          ),
        description: item.string("说明"),
      }))
      .itemDefault({
        id: "new-in-phone-app",
        name: "新手机内部应用",
        phoneAppId: "",
        description: "",
      })
      .maxItems(40)
      .addLabel("添加手机内部应用动作")
      .emptyHint("没有手机内部应用动作。请先由外部通过 @ink-zenly/phone-sdk/plugin 注册应用。")
      .describe(
        "操作：①外部用 @ink-zenly/phone-sdk/plugin 的 registerPhoneApp({ id: 程序ID }) 注册；②添加本动作并填写相同程序 ID（或 扩展ID/程序ID）；③在「手机应用目录」绑定该动作 ID。宿主不编写内页应用。",
      ),
    catalogApps: s
      .array("手机应用目录", (item) => ({
        id: item.string("应用 ID").default("new-app"),
        name: item.string("应用名称").default("新应用"),
        icon: item.asset("应用图标").accepts("image"),
        order: item
          .number("默认排序")
          .default(0)
          .range(0, 9999)
          .step(1)
          .describe("仅整数；数字越小越靠前，相同时按本目录的行顺序。"),
        preinstalled: item.boolean("游戏开始默认预装").default(true),
        enabled: item.boolean("作者默认可用").default(true),
        locked: item.boolean("锁定玩家编辑").default(false),
        defaultActionId: item.string("默认动作 ID").default("settings"),
      }))
      .itemDefault({
        id: "new-app",
        name: "新应用",
        order: 0,
        preinstalled: true,
        enabled: true,
        locked: false,
        defaultActionId: "settings",
      })
      .maxItems(40)
      .addLabel("添加应用")
      .emptyHint("未配置应用时使用插件内置应用目录。")
      .describe(
        "操作：①先在上方任一动作分组中添加动作并记下其 ID；②点击“添加应用”；③填写唯一应用 ID、名称并选择图标；④填写仅整数的“默认排序”，数字越小越靠前，相同时按本目录行顺序；⑤勾选“游戏开始默认预装”决定新游戏是否拥有该 APP；⑥“作者默认可用”决定其初始能否显示；⑦把动作 ID 原样填入“默认动作 ID”。剧情可再通过 APP 管理方法安装、删除、禁用或解禁。",
      ),
    backgroundColor: s.string("默认背景色").default("#172036"),
    backgroundImage: s.asset("默认背景图").accepts("image"),
    backgroundCss: s
      .string("默认 CSS 背景值")
      .default("")
      .describe("例如 linear-gradient(135deg, #182848, #4b6cb7)"),
    accentColor: s.string("默认强调色").default("#79c7ff"),
    shellColor: s.string("默认外壳颜色").default("#11151f"),
    allowPlayerCustomization: s
      .boolean("允许玩家个性化手机")
      .default(true)
      .describe(
        "关闭后隐藏玩家端个性化入口，并忽略玩家保存的名称、图标、背景、颜色、动作覆盖和应用绑定；数据不会删除，重新开启后恢复生效。",
      ),

    allowPlayerWallpaper: s
      .boolean("允许玩家更换背景")
      .default(true)
      .enabledWhen("allowPlayerCustomization", true),
    allowPlayerIcons: s
      .boolean("允许玩家更换图标")
      .default(true)
      .enabledWhen("allowPlayerCustomization", true),
  }));

  static saveSchema = defineSave({
    preferences: {
      type: "list",
      persistence: "shared",
      default: [] as PlayerPhonePreferences[],
      label: "玩家手机个性化配置",
    },
    appAvailability: {
      type: "list",
      persistence: "shared",
      default: [] as PhoneAppAvailabilityOverride[],
      label: "剧情 APP 安装与可用状态",
    },
  });

  /**
   * 在扩展注册时声明全局“打开手机”语义动作。作者设置提供默认快捷键（默认 ArrowUp），
   * Studio 的输入按键映射仍可在此基础上重映射。设置变更时重新声明默认键，不影响已注册的动作处理器。
   * 门控诊断会记录未挂载、正在打开、剧情消息占用和 UI 已显示等静默忽略原因；宿主 show 未 settle 时，
   * 保险计时器会释放 `opening` 锁，避免一次异常显示永久阻塞之后的打开动作。
   */
  static onRegister(ctx: ExtensionContext): void {
    // 尽早安装 Phone SDK 宿主，便于第三方扩展在其后（或排队在其前）完成 registerPhoneApp。
    installPhoneExtensionSdkHost();

    let registeredShortcut = normalizeOpenPhoneShortcut(
      ctx.settings.get<unknown>("openPhoneShortcut"),
    );
    const registerOpenPhoneAction = (shortcut: string) => {
      ctx.input.registerAction({
        id: OPEN_PHONE_ACTION,
        label: "打开手机",
        defaultKeys: [shortcut],
      });
    };
    registerOpenPhoneAction(registeredShortcut);

    // `registerAction` 会覆盖同 ID 的默认键但保留已订阅的语义动作；借此让作者在设置面板改键后立即生效。
    ctx.settings.subscribe<unknown>("openPhoneShortcut", (value) => {
      const nextShortcut = normalizeOpenPhoneShortcut(value);
      if (nextShortcut === registeredShortcut) return;
      registeredShortcut = nextShortcut;
      registerOpenPhoneAction(nextShortcut);
      phoneDebug("open-shortcut-updated", { shortcut: nextShortcut });
    });

    ctx.input.onAction(OPEN_PHONE_ACTION, () => {
      const runtime = getPhoneRuntime(ctx);
      const uiVisible = ctx.ui.isVisible("phone");
      runtimeDebug(runtime, "open-action-received", {
        phoneMounted: runtime.phoneMounted,
        opening: runtime.opening,
        storyMessageSessionVisible: runtime.storyMessageSessionVisible,
        uiVisible,
        mountEpoch: runtime.phoneMountEpoch,
      });

      // 剧情消息正在请求/显示时，ArrowUp 不能抢占当前 Preview 的 phone 容器。
      if (
        !runtime.phoneMounted ||
        runtime.opening ||
        runtime.storyMessageSessionVisible ||
        uiVisible
      ) {
        const reason = !runtime.phoneMounted
          ? "unmounted"
          : runtime.opening
            ? "opening"
            : runtime.storyMessageSessionVisible
              ? "story-message-session"
              : "ui-visible";
        runtimeDebug(runtime, "open-ignored", {
          reason,
          mountEpoch: runtime.phoneMountEpoch,
        });
        return;
      }

      const mountEpoch = runtime.phoneMountEpoch;
      let settled = false;
      let openingTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
      const releaseOpening = (outcome: "shown" | "error" | "timeout") => {
        if (settled) return;
        settled = true;
        if (openingTimer !== undefined) globalThis.clearTimeout(openingTimer);
        runtime.opening = false;
        runtimeDebug(runtime, "open-lock-released", {
          outcome,
          mountEpoch,
          uiVisible: ctx.ui.isVisible("phone"),
        });
      };

      runtime.opening = true;
      try {
        runtimeDebug(runtime, "open-show-start", { mountEpoch });
        const shown = ctx.ui.show("phone", undefined, {
          size: "(100%, 100%)",
          position: "(0, 0)",
          interactable: true,
        });
        openingTimer = globalThis.setTimeout(() => {
          runtimeDebug(runtime, "open-show-timeout", {
            mountEpoch,
            uiVisible: ctx.ui.isVisible("phone"),
          });
          releaseOpening("timeout");
        }, NORMAL_PHONE_OPEN_TIMEOUT_MS);

        void Promise.resolve(shown)
          .then(async () => {
            if (
              !isCurrentPhoneMount(runtime, mountEpoch) &&
              ctx.ui.isVisible("phone")
            ) {
              await ctx.ui.hide("phone");
            }
            releaseOpening("shown");
          })
          .catch((error: unknown) => {
            console.error("[phone] 打开手机失败", error);
            releaseOpening("error");
          });
      } catch (error) {
        console.error("[phone] 打开手机失败", error);
        releaseOpening("error");
      }
    });
  }

  /**
   * 构造宿主挂载 React UI 所需的 props。
   * 会过滤宿主传入的非消息对象，并在闭包内延迟访问 `this.save`，因为 Studio 可能在 render 之后才注入 SaveAPI。
   * `closePhone` 先 resolve 所有等待中的剧情序列，再销毁 UI，避免 Fragment 永久停在扩展方法块。
   */
  render(): ExtensionRenderData<PhoneUIProps> {
    // render 实例的 context 与 method/onRegister 使用同一宿主上下文，闭包只操作该 Preview 的 runtime。
    const runtime = getPhoneRuntime(this.context);
    const inputMessages = this.data?.storyMessages;
    const storyPopupPosition = normalizeStoryPopupPosition(
      this.data?.storyPopupPosition,
    );
    const storyBackground = nonEmptyString(this.data?.storyBackground);
    const storyMessages = Array.isArray(inputMessages)
      ? inputMessages.flatMap((inputMessage) => {
          if (
            !inputMessage ||
            typeof inputMessage.characterId !== "string" ||
            typeof inputMessage.message !== "string"
          )
            return [];

          const direction: PhoneMessageDirection =
            inputMessage.direction === "outgoing" ? "outgoing" : "incoming";
          const avatarSource = (
            CHAT_ROLE_AVATAR_SOURCES as readonly unknown[]
          ).includes(inputMessage.avatarSource)
            ? (inputMessage.avatarSource as ChatRoleAvatarSource)
            : "first-portrait";
          const status = normalizeMessageStatus(inputMessage.status, direction);
          const blockedHint =
            status === "blocked"
              ? (nonEmptyString(inputMessage.blockedHint, 240) ??
                DEFAULT_BLOCKED_HINT)
              : undefined;

          /**
           * 宿主/快照透传样式：再走一遍消毒，非法字段静默丢弃。
           * 缺失视为未自定义，UI 保持默认 incoming/outgoing 外观。
           */
          const bubbleStyle = normalizeChatRoleBubbleStyle(
            inputMessage as unknown as Record<string, unknown>,
          );

          return [
            {
              characterId: inputMessage.characterId,
              chatRoleId:
                nonEmptyString(inputMessage.chatRoleId, 80) ??
                `legacy:${inputMessage.characterId}`,
              avatarSource,
              ...(typeof inputMessage.avatarAsset === "string" &&
              inputMessage.avatarAsset
                ? { avatarAsset: inputMessage.avatarAsset }
                : {}),
              ...(typeof inputMessage.portraitId === "string" &&
              inputMessage.portraitId
                ? { portraitId: inputMessage.portraitId }
                : {}),
              message: inputMessage.message,
              direction,
              status,
              ...(blockedHint ? { blockedHint } : {}),
              // 宿主已带最终布尔则透传；缺失或非 false 时默认显示。
              showAvatar: inputMessage.showAvatar !== false,
              showName: inputMessage.showName !== false,
              ...bubbleStyle,
            },
          ];
        })
      : undefined;

    return {
      component: PhoneUI,
      props: {
        // 延迟到 React mount 后再访问 this.save，兼容宿主在 render 后注入 save proxy。
        loadPreferences: () =>
          (this.save as unknown as SaveAPI<PhoneSaveMap>).get("preferences"),
        savePreferences: (value) =>
          (this.save as unknown as SaveAPI<PhoneSaveMap>).set(
            "preferences",
            value,
          ),
        loadAppAvailability: () =>
          (this.save as unknown as SaveAPI<PhoneSaveMap>).get(
            "appAvailability",
          ),
        isPhoneMounted: () => runtime.phoneMounted,
        closePhone: () => {
          finishStoryMessageSequence(runtime, "ui-close");
          runtime.storyMessageSessionVisible = false;
          runtime.activeStoryMessages = [];
          runtime.activeStoryPopupPosition = "bottom-right";
          runtime.activeStoryBackground = undefined;
          publishStoryMessages(runtime);
          this.close();
        },
        // 不依赖 ctx.ui.show() 的初始 data：首次 render 若尚未拿到消息快照，UI 也能订阅并回放当前会话。
        subscribeStoryMessages: (listener) =>
          subscribeStoryMessages(runtime, listener),
        advanceStoryMessage: () => advanceStoryMessage(runtime),
        ...(storyMessages
          ? {
              storyMessages,
              storyPopupPosition,
              ...(storyBackground ? { storyBackground } : {}),
            }
          : {}),
      },
    };
  }
}
