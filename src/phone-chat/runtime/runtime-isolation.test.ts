import assert from "node:assert/strict";
import { beforeEach, it } from "node:test";
import type { ExtensionContext, SaveAPI } from "@avg-studio/sdk";
import { PHONE_SDK_GLOBAL_KEY } from "@ink-zenly/phone-sdk/plugin";
import { bindChatSave, disposeChatStore, patchChatState, readChatState } from "./store.ts";
import { getChatRuntimeKey } from "./runtime-scope.ts";
import { emitChatBus, subscribeChatBus, setOpenConversationId, getOpenConversationId } from "./bus.ts";
import { cacheAuthorSettings, getCachedAuthorSettings } from "./settings.ts";
import { createReplyWait, resolveReplyWait, resolveReplyWaitsForFriend } from "./reply-wait.ts";
import { sendFriendMessages } from "./actions.ts";

beforeEach(() => { delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY]; });

function save() {
  const values = new Map<string, unknown>();
  let writes = 0;
  const api = {
    get: (key: string) => values.get(key),
    set: (key: string, value: unknown) => { values.set(key, value); writes++; },
  } as unknown as SaveAPI<Record<string, unknown>>;
  return { values, api, writes: () => writes };
}

it("rebinding an empty save never imports the previous save or pre-bind memory", () => {
  const key = {};
  const first = save();
  bindChatSave(first.api, key);
  patchChatState({ friendsExtra: ["alice"] }, "test", key);
  const empty = save();
  bindChatSave(empty.api, key);
  assert.deepEqual(readChatState(key).friendsExtra, []);
  assert.equal(empty.writes(), 0);
  disposeChatStore(key);
  patchChatState({ friendsExtra: ["memory-only"] }, "test", key);
  bindChatSave(empty.api, key);
  assert.deepEqual(readChatState(key).friendsExtra, []);
  assert.equal(empty.writes(), 0);
  assert.deepEqual(first.values.get("friendsExtra"), ["alice"]);
});

it("two Preview controllers and their hosted UI wrappers share only their own state", async () => {
  const a = new AbortController();
  const b = new AbortController();
  const keyFor = (signal: AbortSignal) => getChatRuntimeKey({ flow: { signal } } as ExtensionContext);
  const keyA = keyFor(a.signal), uiA = keyFor(a.signal), keyB = keyFor(b.signal);
  assert.equal(keyA, uiA);
  const first = save(), second = save();
  bindChatSave(first.api, keyA);
  bindChatSave(second.api, keyB);
  let eventsA = 0, eventsB = 0;
  subscribeChatBus(() => { eventsA++; }, uiA);
  subscribeChatBus(() => { eventsB++; }, keyB);
  await sendFriendMessages({ friendCharacterId: "alice", messages: [{ text: "A only", direction: "incoming", status: "unread" }] }, keyA);
  assert.equal(readChatState(uiA).threads[0].messages[0].text, "A only");
  assert.deepEqual(readChatState(keyB).threads, []);
  assert.ok(eventsA > 0);
  assert.equal(eventsB, 0);
  setOpenConversationId("direct:alice", keyA);
  assert.equal(getOpenConversationId(keyB), null);
  cacheAuthorSettings({ ...getCachedAuthorSettings(keyA), appTitle: "A" }, keyA);
  cacheAuthorSettings({ ...getCachedAuthorSettings(keyB), appTitle: "B" }, keyB);
  assert.equal(getCachedAuthorSettings(uiA).appTitle, "A");
  disposeChatStore(keyA);
  emitChatBus({ type: "state-changed", reason: "B" }, keyB);
  assert.equal(eventsB, 1);
  assert.equal(getCachedAuthorSettings(keyB).appTitle, "B");
});

it("old Preview cleanup cannot release another Preview's required reply", async () => {
  const keyA = {}, keyB = {};
  const first = createReplyWait("direct:alice", undefined, keyA);
  const second = createReplyWait("direct:alice", undefined, keyB);
  let finishedB = false;
  void second.promise.then(() => { finishedB = true; });
  resolveReplyWaitsForFriend(undefined, keyA);
  await first.promise;
  assert.equal(finishedB, false);
  resolveReplyWait(second.token, keyB);
  await second.promise;
  assert.equal(finishedB, true);
});
