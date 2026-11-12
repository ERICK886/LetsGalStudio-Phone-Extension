import assert from "node:assert/strict";
import { beforeEach, it } from "node:test";
import type { ExtensionContext, SaveAPI } from "@avg-studio/sdk";
import { PHONE_SDK_GLOBAL_KEY } from "@ink-zenly/phone-sdk/plugin";
import { executeSendFriendMessages, executeSendGroupMessages, executeAwaitPlayerReply } from "./method-execution.ts";
import { bindChatSaveForContext, disposeChatStore, readChatState, restoreChatSaveBinding } from "./store.ts";
import { getChatRuntimeKey } from "./runtime-scope.ts";

beforeEach(() => { delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY]; });

function harness() {
  let cycle = new AbortController();
  let restoring = false;
  const values = new Map<string, unknown>();
  const variables = new Map<string, unknown>([["score", 0]]);
  const save = {
    get: (key: string) => values.get(key),
    set: (key: string, value: unknown) => { values.set(key, structuredClone(value)); },
  } as SaveAPI<Record<string, unknown>>;
  const ctx = {
    flow: { get signal() { return cycle.signal; }, get isRestoring() { return restoring; } },
    settings: { get: () => undefined },
    variables: { get: (key: string) => variables.get(key), set: (key: string, value: unknown) => variables.set(key, value) },
  } as unknown as ExtensionContext;
  return {
    ctx, save, values, variables,
    restore: (value: boolean) => { restoring = value; },
    next: () => { cycle.abort(); cycle = new AbortController(); },
  };
}

it("archive replay does not append saved incoming/reply messages or repeat reply effects", async () => {
  const h = harness();
  const incoming = { friend: "alice", message: "你好", openPhone: false };
  const reply = { friend: "alice", reply1: "收到", reply1Var1: "score", reply1Val1: "1", reply1Op1: "+=" };
  await executeSendFriendMessages(h.ctx, incoming, h.save, { openPhoneApp: false });
  await executeAwaitPlayerReply(h.ctx, reply, h.save, false, { openPhoneApp: false });
  const saved = structuredClone([...h.values]);
  const effects = [...h.variables];
  assert.equal(h.variables.get("score"), 1);
  h.restore(true);
  await executeSendFriendMessages(h.ctx, incoming, h.save, { openPhoneApp: false });
  await executeAwaitPlayerReply(h.ctx, reply, h.save, false, { openPhoneApp: false });
  assert.deepEqual([...h.values], saved);
  assert.deepEqual([...h.variables], effects);
  assert.equal(readChatState(getChatRuntimeKey(h.ctx)).threads[0].messages.length, 2);
  // 相同内容的正常剧情调用仍是两次发送，不能按文本永久去重。
  h.restore(false);
  await executeSendFriendMessages(h.ctx, incoming, h.save, { openPhoneApp: false });
  assert.equal(readChatState(getChatRuntimeKey(h.ctx)).threads[0].messages.length, 3);
});

it("group history is restored without replaying its attached automatic reply", async () => {
  const h = harness();
  const params = { groupId: "club", sender: "alice", message: "集合", reply1: "好", openPhone: false };
  await executeSendGroupMessages(h.ctx, params, h.save, false, { openPhoneApp: false });
  const saved = structuredClone([...h.values]);
  h.restore(true);
  await executeSendGroupMessages(h.ctx, params, h.save, false, { openPhoneApp: false });
  assert.deepEqual([...h.values], saved);
  assert.equal(readChatState(getChatRuntimeKey(h.ctx)).threads[0].messages.length, 2);
});

it("next chapter rebinds the live save before any new message and continues saving", async () => {
  const h = harness();
  bindChatSaveForContext(h.save, h.ctx);
  await executeSendFriendMessages(h.ctx, { friend: "alice", message: "第一章" }, h.save, { openPhoneApp: false });
  const oldKey = getChatRuntimeKey(h.ctx);
  h.next();
  disposeChatStore(oldKey);
  restoreChatSaveBinding({ ...h.ctx });
  assert.equal(readChatState(getChatRuntimeKey(h.ctx)).threads[0].messages[0].text, "第一章");
  await executeSendFriendMessages(h.ctx, { friend: "alice", message: "第二章" }, h.save, { openPhoneApp: false });
  assert.deepEqual(readChatState(getChatRuntimeKey(h.ctx)).threads[0].messages.map(m => m.text), ["第一章", "第二章"]);
  h.values.clear();
  h.next();
  restoreChatSaveBinding(h.ctx);
  assert.deepEqual(readChatState(getChatRuntimeKey(h.ctx)).threads, []);
});
