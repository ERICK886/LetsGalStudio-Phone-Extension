import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { ExtensionContext } from "@avg-studio/sdk";
import {
  acquirePhoneCloseLock,
  PHONE_SDK_GLOBAL_KEY,
  getPhoneSdkSlot,
} from "@ink-zenly/phone-sdk/plugin";
import {
  completeIncomingCallChoice,
  resolveStoryFragmentRef,
} from "./fragment-flow.ts";
import {
  beginIncomingCall,
  resolveActiveIncomingCall,
} from "./runtime.ts";

function createContext(events: string[]): ExtensionContext {
  const signal = new AbortController().signal;
  const host = { role: "method-test" };
  return {
    getHost: () => host,
    settings: { get: () => undefined },
    flow: {
      signal,
      async callFragment(fragmentId: string, options?: { chapterId?: string }) {
        events.push(`fragment:${fragmentId}:${options?.chapterId ?? ""}`);
      },
    },
  } as unknown as ExtensionContext;
}

describe("phone-call method fragment chain", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  });

  it("接听后严格先关闭手机，再调用接听片段", async () => {
    const events: string[] = [];
    const ctx = createContext(events);
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {
        events.push("open");
        return "opened";
      },
      async closePhoneApp() {
        events.push("close");
      },
    };

    const waiting = beginIncomingCall(ctx, {
      id: "incoming-answer",
      characterId: "alice",
      requireAnswer: false,
      answerStory: {
        fragmentId: "answer-fragment",
        chapterId: "chapter-1",
      },
    });
    assert.equal(resolveActiveIncomingCall("answer"), true);
    const choice = await waiting;
    assert.equal(choice, "answer");
    await completeIncomingCallChoice(ctx, choice, {
      fragmentId: "answer-fragment",
      chapterId: "chapter-1",
    }, "incoming-answer");

    assert.deepEqual(events, [
      "open",
      "close",
      "fragment:answer-fragment:chapter-1",
    ]);
  });

  it("挂断后严格先关闭手机，再调用挂断片段", async () => {
    const events: string[] = [];
    const ctx = createContext(events);
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {
        events.push("open");
        return "opened";
      },
      async closePhoneApp() {
        events.push("close");
      },
    };

    const waiting = beginIncomingCall(ctx, {
      id: "incoming-decline",
      characterId: "alice",
      requireAnswer: false,
      declineStory: {
        fragmentId: "decline-fragment",
        chapterId: "chapter-2",
      },
    });
    assert.equal(resolveActiveIncomingCall("decline"), true);
    const choice = await waiting;
    assert.equal(choice, "decline");
    await completeIncomingCallChoice(ctx, choice, {
      fragmentId: "decline-fragment",
      chapterId: "chapter-2",
    }, "incoming-decline");

    assert.deepEqual(events, [
      "open",
      "close",
      "fragment:decline-fragment:chapter-2",
    ]);
  });

  it("热重载遗留关闭锁时仍先关闭手机，再运行片段对话", async () => {
    const events: string[] = [];
    const ctx = createContext(events);
    acquirePhoneCloseLock();
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {
        events.push("open");
        return "opened";
      },
      async closePhoneApp(options) {
        assert.equal(options?.force, true);
        assert.equal(options?.animated, false);
        events.push("close");
      },
    };

    const waiting = beginIncomingCall(ctx, {
      id: "incoming-stale-lock",
      characterId: "alice",
      requireAnswer: false,
      answerStory: { fragmentId: "answer-dialogue" },
    });
    assert.equal(resolveActiveIncomingCall("answer"), true);
    const choice = await waiting;
    await completeIncomingCallChoice(
      ctx,
      choice as "answer",
      { fragmentId: "answer-dialogue" },
      "incoming-stale-lock",
    );

    assert.deepEqual(events, ["open", "close", "fragment:answer-dialogue:"]);
  });

  it("兼容旧预览中的对象形片段参数，不生成 [object Object]", () => {
    assert.deepEqual(resolveStoryFragmentRef({
      answerStory: {
        value: { fragmentId: "answer-fragment", chapterId: "chapter-3" },
      },
    }, "answerStory"), {
      fragmentId: "answer-fragment",
      chapterId: "chapter-3",
    });
  });
});
