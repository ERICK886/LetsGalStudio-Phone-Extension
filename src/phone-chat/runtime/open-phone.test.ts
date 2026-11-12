import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  PHONE_SDK_GLOBAL_KEY,
  getPhoneSdkSlot,
} from "@ink-zenly/phone-sdk/plugin";
import { closeChatPhoneAppAfter, openChatPhoneApp } from "./open-phone.ts";

describe("chat phone navigation", () => {
  it("cancels an old reply's delayed close when the run changes", async () => {
    const cycle = new AbortController();
    let closed = 0;
    getPhoneSdkSlot().navigation = {
      openPhoneApp: async () => "opened",
      closePhoneApp: async () => { closed++; },
    };
    const closing = closeChatPhoneAppAfter(60_000, cycle.signal);
    cycle.abort();
    await closing;
    assert.equal(closed, 0);
    await closeChatPhoneAppAfter(0);
    assert.equal(closed, 1);
  });
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  });

  it("fails fast instead of leaving a required reply pending without a host", async () => {
    await assert.rejects(
      openChatPhoneApp({ friendCharacterId: "alice", waitUntil: "none" }),
      /unavailable/,
    );
  });

  it("opens the direct conversation through the phone host", async () => {
    const calls: unknown[] = [];
    getPhoneSdkSlot().navigation = {
      async openPhoneApp(options) {
        calls.push(options);
        return "opened";
      },
      async closePhoneApp() {},
    };

    await openChatPhoneApp({ friendCharacterId: "alice", waitUntil: "none" });
    assert.deepEqual(calls, [
      {
        appId: "phone-chat",
        waitUntil: "none",
        payload: { conversationId: "direct:alice" },
      },
    ]);
  });
});
