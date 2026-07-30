import {
  Extension,
  INTERNAL_SYSTEM_SLOT,
  defineSave,
  extension,
  method,
  settings,
  type ExtensionContext,
  type ExtensionProps,
  type ExtensionRenderData,
  type SaveAPI,
} from "@avg-studio/sdk";
import { type PlayerPhonePreferences } from "../core/catalog";
import { PhoneUI } from "../ui/phone-ui";

const OPEN_PHONE_ACTION = "ink.zenly.ext-7a9373.open-phone";
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
const LOCAL_COMMAND_IDS = ["quick-save", "quick-load", "toggle-fullscreen"] as const;
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

function debugSnapshot(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
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

type PhoneSaveMap = {
  preferences: readonly PlayerPhonePreferences[];
};

export type PhoneMessageDirection = "incoming" | "outgoing";
export type PhoneMessageStatus = "sending" | "unread" | "read" | "failed" | "blocked";
export type ChatRoleAvatarSource = "first-portrait" | "character-avatar" | "asset";

const CHAT_ROLE_AVATAR_SOURCES = ["first-portrait", "character-avatar", "asset"] as const;
const OUTGOING_MESSAGE_STATUSES = ["sending", "unread", "read", "failed", "blocked"] as const;
const DEFAULT_BLOCKED_HINT = "您的消息已发送，但被对方拒收";

interface ChatRolePreset {
  id: string;
  characterId: string;
  avatarSource: ChatRoleAvatarSource;
  avatarAsset?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, maxLength = 1024): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

function normalizeChatAvatarAssets(value: unknown): ReadonlyMap<string, string> {
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
    const avatarSource = (CHAT_ROLE_AVATAR_SOURCES as readonly unknown[]).includes(raw.avatarSource)
      ? raw.avatarSource as ChatRoleAvatarSource
      : "first-portrait";
    const avatarAssetId = nonEmptyString(raw.avatarAssetId, 80);
    // avatarAsset 是旧版同表字段；保留读取以便已有项目迁移后仍可显示头像。
    const legacyAvatarAsset = nonEmptyString(raw.avatarAsset, 4096);
    const avatarAsset = avatarSource === "asset"
      ? (avatarAssetId ? avatarAssets.get(avatarAssetId) : undefined) ?? legacyAvatarAsset
      : undefined;
    presets.set(id, {
      id,
      characterId,
      avatarSource,
      ...(avatarAsset ? { avatarAsset } : {}),
    });
  }
  return presets;
}

function normalizeMessageStatus(value: unknown, direction: PhoneMessageDirection): PhoneMessageStatus {
  // 对方消息固定已读；我方消息未指定或非法时也默认显示已读。
  if (direction === "incoming") return "read";
  return (OUTGOING_MESSAGE_STATUSES as readonly unknown[]).includes(value)
    ? value as PhoneMessageStatus
    : "read";
}

function normalizeStoryPopupPosition(value: unknown): PhonePopupPosition {
  return (PHONE_POPUP_POSITIONS as readonly unknown[]).includes(value)
    ? value as PhonePopupPosition
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
}

type PhoneStoryMessageListener = (
  messages: readonly PhoneStoryMessage[],
  awaitingAdvance: boolean,
  popupPosition: PhonePopupPosition,
) => void;

export type PhoneStoryAdvanceResult = "appended" | "finished" | "close" | false;

export interface PhoneUIProps extends ExtensionProps {
  loadPreferences: () => readonly PlayerPhonePreferences[];
  savePreferences: (value: readonly PlayerPhonePreferences[]) => void;
  /** 读取当前运行时挂载状态；UI 在异步关闭后据此阻止继续启动动作。 */
  isPhoneMounted: () => boolean;
  closePhone: () => void;
  storyMessages?: readonly PhoneStoryMessage[];
  storyPopupPosition?: PhonePopupPosition;
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

let activeStoryMessages: readonly PhoneStoryMessage[] = [];
let activeStoryPopupPosition: PhonePopupPosition = "bottom-right";
let storyMessageSessionVisible = false;
let pendingStorySequence: PendingStorySequence | undefined;
const storyMessageListeners = new Set<PhoneStoryMessageListener>();

/**
 * 手机功能的运行时挂载状态。它故意不写入 saveSchema：卸载只禁用能力，不删除玩家偏好或作者配置。
 * 每次挂载/卸载都推进 epoch，使已经开始的异步 show/message 请求失效。
 */
let phoneMounted = false;
let phoneMountEpoch = 0;

function isCurrentPhoneMount(epoch: number): boolean {
  return phoneMounted && epoch === phoneMountEpoch;
}

function publishStoryMessages(): void {
  const awaitingAdvance = pendingStorySequence !== undefined;
  phoneDebug("sequence-publish", {
    sequenceId: pendingStorySequence?.debugId ?? null,
    awaitingAdvance,
    messageCount: activeStoryMessages.length,
    nextIndex: pendingStorySequence?.nextIndex ?? null,
    totalCount: pendingStorySequence?.messages.length ?? null,
    listenerCount: storyMessageListeners.size,
  });
  for (const listener of storyMessageListeners) {
    listener(activeStoryMessages, awaitingAdvance, activeStoryPopupPosition);
  }
}

/** 启用运行时手机能力；不自动打开 UI，也不改动任何存档数据。 */
function activatePhoneRuntime(): void {
  if (phoneMounted) return;
  phoneMounted = true;
  phoneMountEpoch += 1;
  phoneDebug("phone-mounted", { epoch: phoneMountEpoch });
}

/**
 * 立即让所有手机入口失效，并清理临时消息会话。
 * pending Promise 必须被 resolve，避免已调用 show-message 的 Fragment 永久等待；preferences 等 SaveAPI 数据不会触碰。
 */
async function deactivatePhoneRuntime(ctx: ExtensionContext): Promise<void> {
  phoneMounted = false;
  phoneMountEpoch += 1;

  const pending = pendingStorySequence;
  pendingStorySequence = undefined;
  storyMessageSessionVisible = false;
  activeStoryMessages = [];
  activeStoryPopupPosition = "bottom-right";
  publishStoryMessages();
  pending?.resolve();

  phoneDebug("phone-unmounted", { epoch: phoneMountEpoch, hadPendingSequence: Boolean(pending) });
  if (!ctx.ui.isVisible("phone")) return;
  try {
    await ctx.ui.hide("phone");
  } catch (error) {
    console.error("[phone] 卸载时关闭手机失败", error);
  }
}

function subscribeStoryMessages(listener: PhoneStoryMessageListener): () => void {
  storyMessageListeners.add(listener);
  phoneDebug("listener-subscribe", { listenerCount: storyMessageListeners.size });
  listener(activeStoryMessages, pendingStorySequence !== undefined, activeStoryPopupPosition);
  return () => {
    storyMessageListeners.delete(listener);
    phoneDebug("listener-unsubscribe", { listenerCount: storyMessageListeners.size });
  };
}

const STORY_UI_SUBSCRIPTION_TIMEOUT_MS = 320;

/**
 * 等待 React 手机 UI 建立消息订阅。
 * `ctx.ui.show()` 的完成只代表宿主已接受显示请求，不保证 React effect 已执行；首次剧情消息必须等待该订阅，
 * 才能避免场景/黑场转场期间出现“方法正在等待、手机却没有显示”的孤立会话。
 */
async function waitForStoryMessageSubscriber(timeoutMs = STORY_UI_SUBSCRIPTION_TIMEOUT_MS): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (storyMessageListeners.size === 0 && Date.now() < deadline) {
    await new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, 16);
    });
  }
  return storyMessageListeners.size > 0;
}

/**
 * 以单次受控重试挂载消息手机。
 * 初次 show 未产生 React 订阅时，先完整 hide 已注册但不可用的容器，再重新 show；不会直接重复注册同一容器。
 */
async function showStoryMessageUi(
  ctx: ExtensionContext,
  storyMessages: readonly PhoneStoryMessage[],
  storyPopupPosition: PhonePopupPosition,
  sequenceId: number,
): Promise<void> {
  const show = () => ctx.ui.show("phone", {
    storyMessages,
    storyPopupPosition,
  }, {
    size: "(100%, 100%)",
    position: "(0, 0)",
    interactable: true,
  });

  await show();
  if (await waitForStoryMessageSubscriber()) return;

  phoneDebug("ui-show-no-subscriber", { sequenceId, attempt: 1 });
  await ctx.ui.hide("phone");
  // 等待宿主卸载旧容器，防止下一次 show 命中“容器已经被注册”。
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });

  await show();
  if (await waitForStoryMessageSubscriber()) return;

  phoneDebug("ui-show-no-subscriber", { sequenceId, attempt: 2 });
  throw new Error("手机剧情消息界面未能完成挂载");
}

function finishStoryMessageSequence(reason = "unspecified"): boolean {
  const sequence = pendingStorySequence;
  if (!sequence) {
    phoneDebug("sequence-finish-ignored", { reason, pending: false });
    return false;
  }

  phoneDebug("sequence-finish", {
    sequenceId: sequence.debugId,
    reason,
    nextIndex: sequence.nextIndex,
    totalCount: sequence.messages.length,
    visibleMessageCount: activeStoryMessages.length,
  });
  pendingStorySequence = undefined;
  publishStoryMessages();
  sequence.resolve();
  return true;
}

/**
 * 推进当前消息会话一次。
 * 有下一条时追加并返回 `appended`；非关闭组的末条会 resolve 会话并返回 `finished`；关闭组的末条返回 `close`，
 * 由 UI 播放退出动画后调用 closePhone 完成 Promise。无活动会话时返回 false，调用方必须安全忽略。
 */
function advanceStoryMessage(): PhoneStoryAdvanceResult {
  const sequence = pendingStorySequence;
  if (!sequence) {
    phoneDebug("advance-ignored", { pending: false });
    return false;
  }

  phoneDebug("advance-received", {
    sequenceId: sequence.debugId,
    nextIndex: sequence.nextIndex,
    totalCount: sequence.messages.length,
    visibleMessageCount: activeStoryMessages.length,
    closeAfterMessages: sequence.closeAfterMessages,
  });

  const nextMessage = sequence.messages[sequence.nextIndex];
  if (nextMessage) {
    const appendedIndex = sequence.nextIndex;
    sequence.nextIndex += 1;
    activeStoryMessages = [...activeStoryMessages, nextMessage];
    phoneDebug("advance-appended", {
      sequenceId: sequence.debugId,
      appendedIndex,
      nextIndex: sequence.nextIndex,
      message: nextMessage,
      visibleMessageCount: activeStoryMessages.length,
    });
    publishStoryMessages();
    return "appended";
  }

  if (sequence.closeAfterMessages) {
    phoneDebug("advance-close-requested", {
      sequenceId: sequence.debugId,
      nextIndex: sequence.nextIndex,
      totalCount: sequence.messages.length,
    });
    return "close";
  }
  finishStoryMessageSequence("group-finished-without-close");
  return "finished";
}

/**
 * 创建、接续或排队一组剧情手机消息。
 *
 * 该函数维护模块级 pending Promise：相同请求复用同一等待结果，其他请求等待上一组结束；首次消息模式会在必要时关闭普通手机，
 * 后续组只发布新快照而不重复 `ctx.ui.show("phone")`。它不会在最后一条时自行关闭或 resolve，必须等待 UI 调用
 * `advanceStoryMessage` 并在需要时执行 `closePhone`，从而保证“最后一条显示后再点一次才关闭”的交互契约。
 */
async function showStoryMessages(
  ctx: ExtensionContext,
  messages: readonly PhoneStoryMessage[],
  appendToExisting: boolean,
  closeAfterMessages: boolean,
  popupPosition: PhonePopupPosition,
): Promise<void> {
  const mountEpoch = phoneMountEpoch;
  if (!isCurrentPhoneMount(mountEpoch)) {
    phoneDebug("sequence-request-ignored-unmounted", { messageCount: messages.length });
    return;
  }

  if (messages.length === 0) {
    phoneDebug("sequence-request-empty", { appendToExisting, closeAfterMessages });
    return;
  }

  const sequenceKey = JSON.stringify({
    messages,
    appendToExisting,
    closeAfterMessages,
    popupPosition,
  });
  phoneDebug("sequence-request", {
    sequenceKey,
    messageCount: messages.length,
    messages,
    appendToExisting,
    closeAfterMessages,
    popupPosition,
    existingSequenceId: pendingStorySequence?.debugId ?? null,
    uiVisible: ctx.ui.isVisible("phone"),
    storyMessageSessionVisible,
  });
  while (pendingStorySequence) {
    const pending = pendingStorySequence;
    const uiAttached = ctx.ui.isVisible("phone") || storyMessageListeners.size > 0;

    // UI 已卸载且没有任何订阅者时，逻辑会话已无法继续显示。不能复用它，
    // 否则重新执行相同方法块只会返回旧 Promise，永远不会再次调用 ctx.ui.show。
    if (!uiAttached) {
      phoneDebug("sequence-request-recover-stale", {
        staleSequenceId: pending.debugId,
        sameSequenceKey: pending.key === sequenceKey,
        uiVisible: ctx.ui.isVisible("phone"),
        listenerCount: storyMessageListeners.size,
      });
      pendingStorySequence = undefined;
      storyMessageSessionVisible = false;
      activeStoryMessages = [];
      activeStoryPopupPosition = "bottom-right";
      publishStoryMessages();
      pending.resolve();
      continue;
    }

    if (pending.key === sequenceKey) {
      phoneDebug("sequence-request-reused", {
        sequenceId: pending.debugId,
        sequenceKey,
      });
      return pending.promise;
    }
    phoneDebug("sequence-request-queued", {
      waitingForSequenceId: pending.debugId,
      nextSequenceKey: sequenceKey,
    });
    await pending.promise;
  }

  if (!isCurrentPhoneMount(mountEpoch)) {
    phoneDebug("sequence-request-cancelled-unmounted", { stage: "after-queue" });
    return;
  }

  const uiVisible = ctx.ui.isVisible("phone");
  const hasStorySession = storyMessageSessionVisible;
  // Studio 的 isVisible 只表示当前可见层，不表示容器是否已注册；接续组以逻辑会话为唯一复用依据。
  const shouldCreateStoryUi = !hasStorySession;
  const continuingSession = appendToExisting && activeStoryMessages.length > 0;
  if (!hasStorySession && uiVisible) {
    await ctx.ui.hide("phone");
  }
  if (!isCurrentPhoneMount(mountEpoch)) {
    phoneDebug("sequence-request-cancelled-unmounted", { stage: "after-hide" });
    return;
  }

  // 接续以扩展自身会话状态为准；宿主短暂重建 UI 时仍保留上一组消息。
  activeStoryPopupPosition = popupPosition;
  activeStoryMessages = continuingSession
    ? [...activeStoryMessages, messages[0]]
    : [messages[0]];
  const debugId = nextStorySequenceDebugId++;
  let resolveSequence!: () => void;
  const sequencePromise = new Promise<void>((resolve) => {
    resolveSequence = resolve;
  });
  pendingStorySequence = {
    debugId,
    key: sequenceKey,
    messages,
    nextIndex: 1,
    closeAfterMessages,
    promise: sequencePromise,
    resolve: resolveSequence,
  };
  phoneDebug("sequence-created", {
    sequenceId: debugId,
    uiVisible,
    hasStorySession,
    continuingSession,
    appendToExisting,
    closeAfterMessages,
    popupPosition,
    activeMessageCount: activeStoryMessages.length,
    totalCount: messages.length,
    messages,
  });
  publishStoryMessages();

  try {
    if (shouldCreateStoryUi) {
      storyMessageSessionVisible = true;
      phoneDebug("ui-show-start", {
        sequenceId: debugId,
        activeMessageCount: activeStoryMessages.length,
        reportedUiVisible: uiVisible,
      });
      await showStoryMessageUi(
        ctx,
        activeStoryMessages,
        activeStoryPopupPosition,
        debugId,
      );
      if (!isCurrentPhoneMount(mountEpoch)) {
        phoneDebug("sequence-request-cancelled-unmounted", { stage: "after-show" });
        if (ctx.ui.isVisible("phone")) await ctx.ui.hide("phone");
        return;
      }
      phoneDebug("ui-show-complete", { sequenceId: debugId });
    } else {
      phoneDebug("ui-show-reused", { sequenceId: debugId, reportedUiVisible: uiVisible });
    }

    phoneDebug("sequence-await-start", { sequenceId: debugId });
    await sequencePromise;
    phoneDebug("sequence-await-resolved", { sequenceId: debugId });
  } catch (error) {
    phoneDebug("sequence-error", {
      sequenceId: debugId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
    });
    storyMessageSessionVisible = false;
    finishStoryMessageSequence("show-or-wait-error");
    throw error;
  } finally {
    const stillOwnsPending = pendingStorySequence?.resolve === resolveSequence;
    phoneDebug("sequence-finally", { sequenceId: debugId, stillOwnsPending });
    if (stillOwnsPending) {
      pendingStorySequence = undefined;
      publishStoryMessages();
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
  const presets = normalizeChatRolePresets(chatRolePresetRows, chatAvatarAssetRows);
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
  phoneDebug("method-params", {
    keys: Object.keys(params),
    slots,
    availableChatRoleIds: [...presets.keys()],
  });

  const messages: PhoneStoryMessage[] = [];
  const defaultPresetId = nonEmptyString(params.presetId, 80);

  for (let index = 1; index <= 8; index += 1) {
    const suffix = index === 1 ? "" : String(index);
    const rawMessage = params[`message${suffix}`];
    if (typeof rawMessage !== "string" || rawMessage.trim() === "") continue;

    const presetId = nonEmptyString(params[`presetId${suffix}`], 80) ?? defaultPresetId;
    const preset = presetId ? presets.get(presetId) : undefined;
    if (!preset) {
      phoneDebug("message-skipped-invalid-chat-role", { index, presetId });
      continue;
    }

    const direction: PhoneMessageDirection = params[`direction${suffix}`] === "outgoing"
      ? "outgoing"
      : "incoming";
    const status = normalizeMessageStatus(params[`status${suffix}`], direction);
    const blockedHint = status === "blocked"
      ? nonEmptyString(params[`blockedHint${suffix}`], 240) ?? DEFAULT_BLOCKED_HINT
      : undefined;
    messages.push({
      characterId: preset.characterId,
      chatRoleId: preset.id,
      avatarSource: preset.avatarSource,
      ...(preset.avatarAsset ? { avatarAsset: preset.avatarAsset } : {}),
      message: rawMessage.trim(),
      direction,
      status,
      ...(blockedHint ? { blockedHint } : {}),
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
    appendToExisting: { type: "boolean", label: "接续上一组消息", default: false } as const,
    closeAfterMessages: { type: "boolean", label: "本组结束后关闭手机", default: true } as const,
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
    ...Object.fromEntries(Array.from({ length: 8 }, (_, offset) => {
      const index = offset + 1;
      const suffix = index === 1 ? "" : String(index);
      const required = index === 1;
      return [
        [`presetId${suffix}`, {
          type: "string",
          label: `第 ${index} 条 · 聊天角色预设 ID`,
          required,
          suggestions: { key: "phone-chat-role-preset" },
        } as const],
        [`message${suffix}`, {
          type: "string",
          label: `第 ${index} 条 · 内容`,
          multiline: true,
          required,
        } as const],
        [`direction${suffix}`, {
          type: "enum",
          label: `第 ${index} 条 · 发送方`,
          options: directionOptions,
          default: "incoming",
          required,
        } as const],
        [`status${suffix}`, {
          type: "enum",
          label: `第 ${index} 条 · 消息状态`,
          options: statusOptions,
          default: "read",
          required,
        } as const],
        [`blockedHint${suffix}`, {
          type: "string",
          label: `第 ${index} 条 · 被拉黑提示文本`,
          multiline: true,
        } as const],
      ];
    }).flat()),
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
  private static opening = false;

  /**
   * Fragment 方法：启用本次运行中的手机功能（method id: `mount-phone`）。
   * 挂载不会自动弹出手机，也不会重置玩家个性化、应用绑定或任何其他保存数据。
   */
  static mountPhone = method({
    id: "mount-phone",
    title: "挂载手机",
    description: "启用手机功能。挂载后可通过快捷键打开手机或调用“显示手机消息”。不会自动打开手机。",
    run() {
      activatePhoneRuntime();
    },
    runImmediately() {
      activatePhoneRuntime();
    },
    skip() {
      activatePhoneRuntime();
    },
  });

  /**
   * Fragment 方法：禁用本次运行中的手机功能（method id: `unmount-phone`）。
   * 会立即结束等待中的消息序列并关闭当前手机 UI，但不清除 shared preferences 或作者配置；再次挂载可继续使用已有数据。
   */
  static unmountPhone = method({
    id: "unmount-phone",
    title: "卸载手机",
    description: "关闭并禁用手机功能，不删除玩家已保存的手机个性化与应用配置。",
    async run(ctx) {
      await deactivatePhoneRuntime(ctx);
    },
    async runImmediately(ctx) {
      await deactivatePhoneRuntime(ctx);
    },
    async skip(ctx) {
      await deactivatePhoneRuntime(ctx);
    },
  });

  /**
   * Studio Fragment 可调用的剧情消息方法（method id 固定为 `show-message`）。
   *
   * 一个块最多读取 8 条消息：空内容或无有效角色的槽位会跳过，后续消息缺少角色时继承第一条角色。
   * 首组默认重新创建列表；`appendToExisting` 仅在活动会话已有消息时追加到旧 UI。方法返回的 Promise 会等待
   * 玩家逐条推进：显示最后一条后，若 `closeAfterMessages` 为 true，需再点击一次由 UI 执行关闭动画。
   * 相同请求会复用当前等待 Promise，不同请求则按调用顺序排队，避免重复注册 `phone` UI 容器。
   */
  static showMessage = method({
    id: "show-message",
    title: "显示手机消息",
    description: "每块最多 8 条。每条填写在扩展设置中定义的聊天角色预设 ID；最后一组显示完并确认后自动关闭手机。",
    schema: createStoryMessageSchema(),
    run(ctx, params) {
      return showStoryMessages(
        ctx,
        collectStoryMessages(
          params as Record<string, unknown>,
          ctx.settings.get<unknown[]>("chatRolePresets"),
          ctx.settings.get<unknown[]>("chatAvatarAssets"),
        ),
        params.appendToExisting === true,
        params.closeAfterMessages !== false,
        normalizeStoryPopupPosition(params.popupPosition),
      );
    },
    /**
     * Studio 的即时执行路径（例如“运行到当前行”）。
     * 消息方法的正常 run 会等待玩家逐条确认，因此此路径必须保持同步且无副作用：
     * 不打开手机、不创建 pending sequence，也不等待 UI 关闭。
     */
    runImmediately() {
      // Intentionally empty: 立即执行时跳过纯展示型剧情消息。
    },
    /**
     * Ctrl 快进路径。与 runImmediately 一样跳过纯展示型消息，避免快进过程中被手机 UI 阻塞。
     */
    skip() {
      // Intentionally empty: 快进不弹出手机。
    },
  });

  static settings = settings((s) => ({
    phoneTitle: s.string("手机标题").default("手机"),
    popupPosition: s.enum("手机弹出位置", PHONE_POPUP_POSITIONS)
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
      .describe("选择手机贴近视口的弹出位置；打开时从该方向滑入并淡入，关闭时反向滑出。"),
    chatAvatarAssets: s.array("聊天头像素材库", (item) => ({
      id: item.string("素材 ID").default("new-chat-avatar"),
      asset: item.asset("头像素材").accepts("image"),
    }))
      .itemDefault({ id: "new-chat-avatar" })
      .maxItems(80)
      .addLabel("添加头像素材")
      .emptyHint("仅在聊天角色使用“新扩展素材”头像时添加。")
      .describe("自定义头像集中在此处选择，避免素材预览撑高聊天角色预设表格。记录素材 ID 后，将它填入对应角色预设的“头像素材 ID”。"),
    chatRolePresets: s.array("聊天角色预设", (item) => ({
      id: item.string("预设 ID").default("new-chat-role"),
      characterId: item.character("资产角色"),
      avatarSource: item.enum("头像来源", CHAT_ROLE_AVATAR_SOURCES)
        .default("first-portrait")
        .labels({
          "first-portrait": "第一张立绘（默认）",
          "character-avatar": "角色默认头像",
          asset: "扩展素材库",
        }),
      avatarAssetId: item.string("头像素材 ID").default(""),
    }))
      .itemDefault({
        id: "new-chat-role",
        avatarSource: "first-portrait",
        avatarAssetId: "",
      })
      .maxItems(80)
      .addLabel("添加聊天角色预设")
      .emptyHint("未配置聊天角色预设时，显示手机消息会跳过对应消息。")
      .describe("每条预设绑定一个项目资产角色。消息块填写预设 ID；角色名可覆盖资产角色名。只有选择“扩展素材库”时，才需要填写上方素材库的素材 ID。"),
    programUiActions: s.array("动作 · 程序 UI", (item) => ({
      id: item.string("ID").default("new-program-ui"),
      name: item.string("名称").default("新程序界面"),
      programUiRef: item.string("UI 引用")
        .describe("本扩展填 ui-id；跨扩展填 extension-id/ui-id，不要加 @。"),
      description: item.string("说明"),
    }))
      .itemDefault({ id: "new-program-ui", name: "新程序界面", programUiRef: "", description: "" })
      .maxItems(40)
      .addLabel("添加程序 UI 动作")
      .emptyHint("没有程序 UI 动作。")
      .describe("操作：①点击“添加程序 UI 动作”；②填写唯一 ID 和名称；③本扩展 UI 填 ui-id，跨扩展填 extension-id/ui-id（不要加 @）；④在“手机应用目录”的默认动作 ID 中填写同一 ID。"),
    visualUiActions: s.array("动作 · 可视化 UI", (item) => ({
      id: item.string("ID").default("new-visual-ui"),
      name: item.string("名称").default("新可视化界面"),
      visualUiName: item.string("界面名称")
        .describe("项目界面填 ui-name；扩展界面填 @extension-id/ui-name。"),
      modal: item.boolean("模态").default(true),
      description: item.string("说明"),
    }))
      .itemDefault({ id: "new-visual-ui", name: "新可视化界面", visualUiName: "", modal: true, description: "" })
      .maxItems(40)
      .addLabel("添加可视化 UI 动作")
      .emptyHint("没有可视化 UI 动作。")
      .describe("操作：①点击“添加可视化 UI 动作”；②填写唯一 ID 和名称；③项目界面填 ui-name，扩展界面填 @extension-id/ui-name；④按需开启模态；⑤在应用目录中绑定该 ID。"),
    systemSlotActions: s.array("动作 · 内置系统界面", (item) => ({
      id: item.string("ID").default("new-system-ui"),
      name: item.string("名称").default("新系统界面"),
      systemSlot: item.enum("系统界面", SYSTEM_SLOT_IDS)
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
      .itemDefault({ id: "new-system-ui", name: "新系统界面", systemSlot: INTERNAL_SYSTEM_SLOT.Settings, description: "" })
      .maxItems(40)
      .addLabel("添加系统界面动作")
      .emptyHint("没有额外的系统界面动作。")
      .describe("操作：①点击“添加系统界面动作”；②填写唯一 ID 和名称；③从下拉框选择标题、存档、读档、设置、历史或鉴赏界面；④在应用目录中绑定该 ID。"),
    internalMethodActions: s.array("动作 · 手机内部方法", (item) => ({
      id: item.string("ID").default("new-internal-method"),
      name: item.string("名称").default("新内部方法"),
      commandId: item.enum("内部方法", LOCAL_COMMAND_IDS)
        .default("quick-save")
        .labels({
          "quick-save": "快速存档",
          "quick-load": "快速读档",
          "toggle-fullscreen": "切换全屏",
        }),
      description: item.string("说明"),
    }))
      .itemDefault({ id: "new-internal-method", name: "新内部方法", commandId: "quick-save", description: "" })
      .maxItems(40)
      .addLabel("添加内部方法动作")
      .emptyHint("没有额外的手机内部方法动作。")
      .describe("操作：①点击“添加内部方法动作”；②填写唯一 ID 和名称；③从下拉框选择快速存档、快速读档或切换全屏；④在应用目录中绑定该 ID。只能选择插件预注册的安全方法。"),
    catalogApps: s.array("手机应用目录", (item) => ({
      id: item.string("应用 ID").default("new-app"),
      name: item.string("应用名称").default("新应用"),
      icon: item.asset("应用图标").accepts("image"),
      enabled: item.boolean("启用").default(true),
      locked: item.boolean("锁定玩家编辑").default(false),
      defaultActionId: item.string("默认动作 ID").default("settings"),
    }))
      .itemDefault({
        id: "new-app",
        name: "新应用",
        enabled: true,
        locked: false,
        defaultActionId: "settings",
      })
      .maxItems(40)
      .addLabel("添加应用")
      .emptyHint("未配置应用时使用插件内置应用目录。")
      .describe("操作：①先在上方任一动作分组中添加动作并记下其 ID；②点击“添加应用”；③填写唯一应用 ID、名称并选择图标；④把动作 ID 原样填入“默认动作 ID”；⑤按需启用或锁定玩家编辑。"),
    backgroundColor: s.string("默认背景色").default("#172036"),
    backgroundImage: s.asset("默认背景图").accepts("image"),
    backgroundCss: s.string("默认 CSS 背景值")
      .default("")
      .describe("例如 linear-gradient(135deg, #182848, #4b6cb7)"),
    accentColor: s.string("默认强调色").default("#79c7ff"),
    shellColor: s.string("默认外壳颜色").default("#11151f"),
    allowPlayerCustomization: s.boolean("允许玩家个性化手机")
      .default(true)
      .describe("关闭后隐藏玩家端个性化入口，并忽略玩家保存的名称、图标、背景、颜色、动作覆盖和应用绑定；数据不会删除，重新开启后恢复生效。"),
    allowPlayerWallpaper: s.boolean("允许玩家更换背景")
      .default(true)
      .enabledWhen("allowPlayerCustomization", true),
    allowPlayerIcons: s.boolean("允许玩家更换图标")
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
  });

  /**
   * 在扩展注册时声明全局“打开手机”语义动作，并绑定默认 ArrowUp。
   * 门控诊断会记录未挂载、正在打开、剧情消息占用和 UI 已显示等静默忽略原因；宿主 show 未 settle 时，
   * 保险计时器会释放 `opening` 锁，避免一次异常显示永久阻塞之后的打开动作。
   */
  static onRegister(ctx: ExtensionContext): void {
    ctx.input.registerAction({
      id: OPEN_PHONE_ACTION,
      label: "打开手机",
      defaultKeys: ["ArrowUp"],
    });

    ctx.input.onAction(OPEN_PHONE_ACTION, () => {
      const uiVisible = ctx.ui.isVisible("phone");
      phoneDebug("open-action-received", {
        phoneMounted,
        opening: PhoneExtension.opening,
        storyMessageSessionVisible,
        uiVisible,
        mountEpoch: phoneMountEpoch,
      });

      // 剧情消息正在请求/显示时，ArrowUp 不能抢占同一个 phone 容器并把普通手机关闭回调误用于结束剧情序列。
      if (!phoneMounted || PhoneExtension.opening || storyMessageSessionVisible || uiVisible) {
        const reason = !phoneMounted
          ? "unmounted"
          : PhoneExtension.opening
            ? "opening"
            : storyMessageSessionVisible
              ? "story-message-session"
              : "ui-visible";
        phoneDebug("open-ignored", { reason, mountEpoch: phoneMountEpoch });
        return;
      }

      const mountEpoch = phoneMountEpoch;
      let settled = false;
      let openingTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
      const releaseOpening = (outcome: "shown" | "error" | "timeout") => {
        if (settled) return;
        settled = true;
        if (openingTimer !== undefined) globalThis.clearTimeout(openingTimer);
        PhoneExtension.opening = false;
        phoneDebug("open-lock-released", {
          outcome,
          mountEpoch,
          uiVisible: ctx.ui.isVisible("phone"),
        });
      };

      PhoneExtension.opening = true;
      try {
        phoneDebug("open-show-start", { mountEpoch });
        const shown = ctx.ui.show("phone", undefined, {
          size: "(100%, 100%)",
          position: "(0, 0)",
          interactable: true,
        });
        openingTimer = globalThis.setTimeout(() => {
          phoneDebug("open-show-timeout", {
            mountEpoch,
            uiVisible: ctx.ui.isVisible("phone"),
          });
          releaseOpening("timeout");
        }, NORMAL_PHONE_OPEN_TIMEOUT_MS);

        void Promise.resolve(shown)
          .then(async () => {
            if (!isCurrentPhoneMount(mountEpoch) && ctx.ui.isVisible("phone")) {
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
    const inputMessages = this.data?.storyMessages;
    const storyPopupPosition = normalizeStoryPopupPosition(this.data?.storyPopupPosition);
    const storyMessages = Array.isArray(inputMessages)
      ? inputMessages.flatMap((inputMessage) => {
          if (
            !inputMessage ||
            typeof inputMessage.characterId !== "string" ||
            typeof inputMessage.message !== "string"
          ) return [];

          const direction: PhoneMessageDirection = inputMessage.direction === "outgoing" ? "outgoing" : "incoming";
          const avatarSource = (CHAT_ROLE_AVATAR_SOURCES as readonly unknown[]).includes(inputMessage.avatarSource)
            ? inputMessage.avatarSource as ChatRoleAvatarSource
            : "first-portrait";
          const status = normalizeMessageStatus(inputMessage.status, direction);
          const blockedHint = status === "blocked"
            ? nonEmptyString(inputMessage.blockedHint, 240) ?? DEFAULT_BLOCKED_HINT
            : undefined;

          return [{
            characterId: inputMessage.characterId,
            chatRoleId: nonEmptyString(inputMessage.chatRoleId, 80) ?? `legacy:${inputMessage.characterId}`,
            avatarSource,
            ...(typeof inputMessage.avatarAsset === "string" && inputMessage.avatarAsset
              ? { avatarAsset: inputMessage.avatarAsset }
              : {}),
            ...(typeof inputMessage.portraitId === "string" && inputMessage.portraitId
              ? { portraitId: inputMessage.portraitId }
              : {}),
            message: inputMessage.message,
            direction,
            status,
            ...(blockedHint ? { blockedHint } : {}),
          }];
        })
      : undefined;

    return {
      component: PhoneUI,
      props: {
        // 延迟到 React mount 后再访问 this.save，兼容宿主在 render 后注入 save proxy。
        loadPreferences: () =>
          (this.save as unknown as SaveAPI<PhoneSaveMap>).get("preferences"),
        savePreferences: (value) =>
          (this.save as unknown as SaveAPI<PhoneSaveMap>).set("preferences", value),
        isPhoneMounted: () => phoneMounted,
        closePhone: () => {
          finishStoryMessageSequence();
          storyMessageSessionVisible = false;
          activeStoryMessages = [];
          activeStoryPopupPosition = "bottom-right";
          publishStoryMessages();
          this.close();
        },
        // 不依赖 ctx.ui.show() 的初始 data：首次 render 若尚未拿到消息快照，UI 也能订阅并回放当前会话。
        subscribeStoryMessages,
        advanceStoryMessage,
        ...(storyMessages ? { storyMessages, storyPopupPosition } : {}),
      },
    };
  }
}
