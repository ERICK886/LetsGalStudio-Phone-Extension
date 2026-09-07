import type { ExtensionContext, SaveAPI } from "@avg-studio/sdk";
import {
  acquirePhoneCloseLock,
  getPhoneSdkSlot,
  getRegisteredPhoneApp,
  openPhoneApp,
} from "@ink-zenly/phone-sdk/plugin";
import { PROGRAM_ID } from "./constants";
import { getPhoneCallSettings, phoneCallRuntimeScope } from "./settings";
import type {
  CallRecord,
  IncomingCallSession,
  OutgoingStoryDefinition,
  PhoneCallState,
} from "./types";

type SaveMap = {
  contactsExtra: string[];
  contactsRemoved: string[];
  records: CallRecord[];
  outgoingStories: OutgoingStoryDefinition[];
};

export type IncomingCallChoice = "answer" | "decline" | "cancelled";

interface PhoneCallRuntime {
  save: SaveAPI<SaveMap> | null;
  memory: PhoneCallState;
  listeners: Set<() => void>;
  incoming: IncomingCallSession | null;
  incomingResolve: ((choice: IncomingCallChoice) => void) | null;
  releasePhoneCloseLock: (() => void) | null;
}

const runtimes = new WeakMap<object, PhoneCallRuntime>();
let debugSequence = 0;

function emptyState(): PhoneCallState {
  return {
    contactsExtra: [],
    contactsRemoved: [],
    records: [],
    outgoingStories: [],
  };
}

function runtimeFor(ctx: ExtensionContext): PhoneCallRuntime {
  const scope = phoneCallRuntimeScope(ctx);
  let runtime = runtimes.get(scope);
  if (!runtime) {
    runtime = {
      save: null,
      memory: emptyState(),
      listeners: new Set(),
      incoming: null,
      incomingResolve: null,
      releasePhoneCloseLock: null,
    };
    runtimes.set(scope, runtime);
  }
  return runtime;
}

function cloneState(value: PhoneCallState): PhoneCallState {
  return {
    contactsExtra: [...value.contactsExtra],
    contactsRemoved: [...value.contactsRemoved],
    records: value.records.map((record) => ({ ...record })),
    outgoingStories: value.outgoingStories.map((story) => ({ ...story })),
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    const normalized = String(item ?? "").trim();
    if (normalized && !result.includes(normalized)) result.push(normalized);
  }
  return result;
}

function normalizeRecords(value: unknown): CallRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is CallRecord => {
      if (!item || typeof item !== "object") return false;
      const record = item as Partial<CallRecord>;
      return (
        typeof record.id === "string" &&
        typeof record.characterId === "string" &&
        (record.direction === "incoming" || record.direction === "outgoing") &&
        (record.status === "answered" ||
          record.status === "declined" ||
          record.status === "missed") &&
        typeof record.timestamp === "number"
      );
    })
    .map((record) => ({ ...record }));
}

function normalizeStories(value: unknown): OutgoingStoryDefinition[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is OutgoingStoryDefinition => {
      if (!item || typeof item !== "object") return false;
      const story = item as Partial<OutgoingStoryDefinition>;
      return (
        typeof story.characterId === "string" &&
        typeof story.fragmentId === "string" &&
        typeof story.definedAt === "number"
      );
    })
    .map((story) => ({ ...story }));
}

function notify(runtime: PhoneCallRuntime): void {
  for (const listener of runtime.listeners) listener();
}

export function phoneCallDebug(
  event: string,
  details?: Record<string, unknown>,
): void {
  console.info("[phone-call:incoming]", {
    seq: ++debugSequence,
    event,
    time: new Date().toISOString(),
    ...details,
  });
}

export function bindPhoneCallSave(
  ctx: ExtensionContext,
  api: SaveAPI<Record<string, unknown>>,
): void {
  const runtime = runtimeFor(ctx);
  const candidate = api as unknown as SaveAPI<SaveMap> | null | undefined;
  if (
    !candidate ||
    typeof candidate.get !== "function" ||
    typeof candidate.set !== "function"
  ) {
    runtime.save = null;
    phoneCallDebug("save-bind-skipped", {
      reason: "invalid-save-api",
      apiType: typeof api,
    });
    return;
  }

  runtime.save = candidate;
  runtime.memory = readPhoneCallState(ctx);
  phoneCallDebug("save-bound", {
    contactsExtra: runtime.memory.contactsExtra.length,
    contactsRemoved: runtime.memory.contactsRemoved.length,
    records: runtime.memory.records.length,
    outgoingStories: runtime.memory.outgoingStories.length,
  });
}

export function readPhoneCallState(ctx: ExtensionContext): PhoneCallState {
  const runtime = runtimeFor(ctx);
  if (!runtime.save) return cloneState(runtime.memory);
  return {
    contactsExtra: normalizeStringArray(runtime.save.get("contactsExtra")),
    contactsRemoved: normalizeStringArray(runtime.save.get("contactsRemoved")),
    records: normalizeRecords(runtime.save.get("records")),
    outgoingStories: normalizeStories(runtime.save.get("outgoingStories")),
  };
}

function write(ctx: ExtensionContext, next: PhoneCallState): void {
  const runtime = runtimeFor(ctx);
  runtime.memory = cloneState(next);
  if (runtime.save) {
    runtime.save.set("contactsExtra", [...next.contactsExtra]);
    runtime.save.set("contactsRemoved", [...next.contactsRemoved]);
    runtime.save.set("records", next.records.map((record) => ({ ...record })));
    runtime.save.set(
      "outgoingStories",
      next.outgoingStories.map((story) => ({ ...story })),
    );
  }
  notify(runtime);
}

export function subscribePhoneCall(
  ctx: ExtensionContext,
  listener: () => void,
): () => void {
  const runtime = runtimeFor(ctx);
  runtime.listeners.add(listener);
  return () => runtime.listeners.delete(listener);
}

export function getIncomingCall(
  ctx: ExtensionContext,
): IncomingCallSession | null {
  const incoming = runtimeFor(ctx).incoming;
  return incoming ? { ...incoming } : null;
}

function setPhoneCallLayer(layer: "foreground" | "background"): void {
  const root = globalThis.document?.querySelector<HTMLElement>("[data-phone-root]");
  if (root) root.dataset.phoneCallLayer = layer;
  phoneCallDebug("layer-change", { layer, rootFound: Boolean(root) });
}

function clearIncoming(
  ctx: ExtensionContext,
  resolution: IncomingCallChoice,
): void {
  const runtime = runtimeFor(ctx);
  const resolve = runtime.incomingResolve;
  runtime.incoming = null;
  runtime.incomingResolve = null;
  runtime.releasePhoneCloseLock?.();
  runtime.releasePhoneCloseLock = null;
  setPhoneCallLayer("foreground");
  notify(runtime);
  resolve?.(resolution);
}

export function listContacts(ctx: ExtensionContext): string[] {
  const state = readPhoneCallState(ctx);
  const removed = new Set(state.contactsRemoved);
  const result: string[] = [];
  const defaults = getPhoneCallSettings(ctx).defaultContacts.map(
    (contact) => contact.characterId,
  );
  for (const id of [...defaults, ...state.contactsExtra]) {
    if (id && !removed.has(id) && !result.includes(id)) result.push(id);
  }
  return result;
}

export function resolveDialTarget(
  ctx: ExtensionContext,
  input: string,
): string | null {
  const normalized = input.trim();
  if (!normalized) return null;
  const contacts = getPhoneCallSettings(ctx).defaultContacts;
  const numberMatch = contacts.find(
    (contact) => contact.phoneNumber && contact.phoneNumber === normalized,
  );
  if (numberMatch) return numberMatch.characterId;
  return listContacts(ctx).includes(normalized) ? normalized : null;
}

export function addContact(ctx: ExtensionContext, rawId: string): void {
  const id = rawId.trim();
  if (!id) return;
  const state = readPhoneCallState(ctx);
  write(ctx, {
    ...state,
    contactsExtra: state.contactsExtra.includes(id)
      ? state.contactsExtra
      : [...state.contactsExtra, id],
    contactsRemoved: state.contactsRemoved.filter((item) => item !== id),
  });
}

export function removeContact(ctx: ExtensionContext, rawId: string): void {
  const id = rawId.trim();
  if (!id) return;
  const state = readPhoneCallState(ctx);
  write(ctx, {
    ...state,
    contactsExtra: state.contactsExtra.filter((item) => item !== id),
    contactsRemoved: state.contactsRemoved.includes(id)
      ? state.contactsRemoved
      : [...state.contactsRemoved, id],
  });
}

export function defineOutgoingStory(
  ctx: ExtensionContext,
  definition: OutgoingStoryDefinition,
): void {
  const state = readPhoneCallState(ctx);
  write(ctx, {
    ...state,
    outgoingStories: [
      ...state.outgoingStories.filter(
        (item) => item.characterId !== definition.characterId,
      ),
      { ...definition },
    ],
  });
}

export function getOutgoingStory(
  ctx: ExtensionContext,
  characterId: string,
): OutgoingStoryDefinition | undefined {
  return readPhoneCallState(ctx)
    .outgoingStories.filter((item) => item.characterId === characterId)
    .sort((left, right) => right.definedAt - left.definedAt)[0];
}

export function addRecord(
  ctx: ExtensionContext,
  record: Omit<CallRecord, "id" | "timestamp">,
): void {
  const state = readPhoneCallState(ctx);
  write(ctx, {
    ...state,
    records: [
      {
        ...record,
        id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      },
      ...state.records,
    ].slice(0, 200),
  });
}

export async function beginIncomingCall(
  ctx: ExtensionContext,
  session: IncomingCallSession,
): Promise<IncomingCallChoice> {
  const slot = getPhoneSdkSlot();
  const runtime = runtimeFor(ctx);
  phoneCallDebug("begin", {
    sessionId: session.id,
    characterId: session.characterId,
    requireAnswer: session.requireAnswer,
    position: session.position ?? null,
    hasAnswerStory: Boolean(session.answerStory?.fragmentId),
    hasDeclineStory: Boolean(session.declineStory?.fragmentId),
    hasNavigation: Boolean(slot.navigation),
    hasAnimatedClose: Boolean(slot.requestAnimatedClosePhone),
    registeredApp: Boolean(getRegisteredPhoneApp(PROGRAM_ID)),
    registeredAppIds: slot.apps ? [...slot.apps.keys()] : [],
    previousIncoming: runtime.incoming?.id ?? null,
  });
  if (runtime.incomingResolve) {
    phoneCallDebug("replace-previous", {
      previousSessionId: runtime.incoming?.id ?? null,
    });
    clearIncoming(ctx, "cancelled");
  }

  runtime.incoming = { ...session, phase: "ringing" };
  setPhoneCallLayer("foreground");
  runtime.releasePhoneCloseLock = acquirePhoneCloseLock();
  notify(runtime);
  const choicePromise = new Promise<IncomingCallChoice>((resolve) => {
    runtime.incomingResolve = resolve;
  });

  phoneCallDebug("open-request", {
    appId: PROGRAM_ID,
    phoneCloseLocked: slot.phoneCloseLocked,
  });
  try {
    const result = await openPhoneApp({
      appId: PROGRAM_ID,
      waitUntil: "none",
      position: session.position,
      payload: { screen: "incoming", sessionId: session.id },
    });
    phoneCallDebug("open-request-resolved", {
      result,
      stillPending: runtime.incoming?.id === session.id,
      hasNavigation: Boolean(getPhoneSdkSlot().navigation),
      latestNavigateAppId: getPhoneSdkSlot().phoneNavigatePending?.appId ?? null,
      latestNavigateSeq: getPhoneSdkSlot().phoneNavigatePending?.seq ?? null,
    });
    if (result !== "opened") {
      clearIncoming(ctx, "cancelled");
      throw new Error(`无法打开来电界面（${result}）`);
    }
  } catch (error) {
    if (runtime.incoming?.id === session.id) clearIncoming(ctx, "cancelled");
    console.error("[phone-call:incoming] open-request-failed", error);
    throw error;
  }
  return choicePromise;
}

export function resolveIncomingCall(
  ctx: ExtensionContext,
  choice: "answer" | "decline",
): void {
  const runtime = runtimeFor(ctx);
  const current = runtime.incoming;
  if (
    !current ||
    !runtime.incomingResolve ||
    (choice === "decline" && current.requireAnswer)
  ) {
    return;
  }
  phoneCallDebug("choice", { sessionId: current.id, choice });
  addRecord(ctx, {
    characterId: current.characterId,
    direction: "incoming",
    status: choice === "answer" ? "answered" : "declined",
  });
  clearIncoming(ctx, choice);
}

export function releaseIncomingCall(ctx: ExtensionContext): void {
  clearIncoming(ctx, "cancelled");
}
