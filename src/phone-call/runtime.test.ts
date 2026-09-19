import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { ExtensionContext, SaveAPI } from "@avg-studio/sdk";
import {
  PHONE_SDK_GLOBAL_KEY,
  getPhoneSdkSlot,
} from "@ink-zenly/phone-sdk/plugin";
import {
  addContact,
  beginIncomingCall,
  bindPhoneCallSave,
  getIncomingCall,
  getActiveIncomingCall,
  listContacts,
  readPhoneCallState,
  releaseIncomingCall,
  resolveDialTarget,
  resolveIncomingCall,
  resolveActiveIncomingCall,
  subscribeActiveIncomingCall,
  subscribePhoneCall,
} from "./runtime.ts";
import {
  cachePhoneCallSettings,
  readPhoneCallSettings,
} from "./settings.ts";

function createContext(
  host: object,
  defaultContacts: unknown[] = [],
): ExtensionContext {
  return {
    getHost: () => host,
    settings: {
      get: (key: string) => key === "defaultContacts" ? defaultContacts : undefined,
    },
  } as unknown as ExtensionContext;
}

function createSave(): SaveAPI<Record<string, unknown>> {
  const values = new Map<string, unknown>();
  return {
    get: (key: string) => values.get(key),
    set: (key: string, value: unknown) => {
      values.set(key, value);
    },
    useValue: (() => {
      throw new Error("not used in this test");
    }) as SaveAPI<Record<string, unknown>>["useValue"],
  } as SaveAPI<Record<string, unknown>>;
}

const session = {
  id: "incoming-1",
  characterId: "alice",
  requireAnswer: false,
};

describe("phone-call runtime", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  });

  it("does not leave an incoming-call gate pending when navigation is unavailable", async () => {
    const ctx = createContext({});
    await assert.rejects(beginIncomingCall(ctx, session), /unavailable/);
    assert.equal(getIncomingCall(ctx), null);
    assert.equal(getPhoneSdkSlot().phoneCloseLocked, false);
  });

  it("records an answered call and resolves the forced gate", async () => {
    const ctx = createContext({});
    bindPhoneCallSave(ctx, createSave());
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {
        return "opened";
      },
      async closePhoneApp() {},
    };

    const waiting = beginIncomingCall(ctx, session);
    assert.equal(getIncomingCall(ctx)?.characterId, "alice");
    resolveIncomingCall(ctx, "answer");

    assert.equal(await waiting, "answer");
    assert.equal(readPhoneCallState(ctx).records[0]?.status, "answered");
    assert.equal(getPhoneSdkSlot().phoneCloseLocked, false);
  });

  it("bridges an incoming call from the method context to the phone app context", async () => {
    const methodCtx = createContext({ role: "phone-call-method" });
    const phoneAppCtx = createContext({ role: "phone-host-app" });
    bindPhoneCallSave(methodCtx, createSave());
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {
        return "opened";
      },
      async closePhoneApp() {},
    };

    const waiting = beginIncomingCall(methodCtx, session);
    assert.equal(getIncomingCall(phoneAppCtx), null);
    assert.equal(getActiveIncomingCall()?.characterId, "alice");
    assert.equal(resolveActiveIncomingCall("answer"), true);

    assert.equal(await waiting, "answer");
    assert.equal(getActiveIncomingCall(), null);
    assert.equal(readPhoneCallState(methodCtx).records[0]?.status, "answered");
  });

  it("keeps the runtime stable when getHost returns a new wrapper each time", async () => {
    const application = {};
    const ctx = {
      getHost: () => ({ application, mode: "engine" }),
      settings: { get: () => undefined },
    } as unknown as ExtensionContext;
    bindPhoneCallSave(ctx, createSave());
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {
        return "opened";
      },
      async closePhoneApp() {},
    };

    const waiting = beginIncomingCall(ctx, session);
    assert.equal(getIncomingCall(ctx)?.id, session.id);
    assert.equal(resolveActiveIncomingCall("answer"), true);

    assert.equal(await waiting, "answer");
    assert.equal(readPhoneCallState(ctx).records[0]?.status, "answered");
  });

  it("does not accept decline when the incoming call requires an answer", async () => {
    const ctx = createContext({});
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {
        return "opened";
      },
      async closePhoneApp() {},
    };

    const waiting = beginIncomingCall(ctx, { ...session, requireAnswer: true });
    assert.equal(resolveActiveIncomingCall("decline"), false);
    assert.equal(getActiveIncomingCall()?.id, session.id);
    assert.equal(resolveActiveIncomingCall("answer"), true);
    assert.equal(await waiting, "answer");
  });

  it("resolves the story gate even when stale listeners and save writes fail", async () => {
    const ctx = createContext({});
    const failingSave = createSave();
    failingSave.set = () => {
      throw new Error("stale save context");
    };
    bindPhoneCallSave(ctx, failingSave);
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {
        return "opened";
      },
      async closePhoneApp() {},
    };
    const unsubscribeRuntime = subscribePhoneCall(ctx, () => {
      throw new Error("stale runtime listener");
    });
    const unsubscribeBridge = subscribeActiveIncomingCall(() => {
      throw new Error("stale bridge listener");
    });

    const waiting = beginIncomingCall(ctx, session);
    assert.equal(resolveActiveIncomingCall("answer"), true);
    assert.equal(await waiting, "answer");
    assert.equal(getActiveIncomingCall(), null);
    assert.equal(getPhoneSdkSlot().phoneCloseLocked, false);

    unsubscribeRuntime();
    unsubscribeBridge();
  });

  it("cancels reset cleanup without recording a declined call", async () => {
    const ctx = createContext({});
    bindPhoneCallSave(ctx, createSave());
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {
        return "opened";
      },
      async closePhoneApp() {},
    };

    const waiting = beginIncomingCall(ctx, session);
    releaseIncomingCall(ctx);

    assert.equal(await waiting, "cancelled");
    assert.deepEqual(readPhoneCallState(ctx).records, []);
  });

  it("isolates saved contacts by engine host", () => {
    const ctxA = createContext({});
    const ctxB = createContext({});
    bindPhoneCallSave(ctxA, createSave());
    bindPhoneCallSave(ctxB, createSave());

    addContact(ctxA, "alice");
    addContact(ctxB, "bob");

    assert.deepEqual(listContacts(ctxA), ["alice"]);
    assert.deepEqual(listContacts(ctxB), ["bob"]);
  });

  it("maps a configured phone number to its character", () => {
    const ctx = createContext({}, [
      { characterId: "alice", phoneNumber: "10086" },
      { characterId: "bob", phoneNumber: "10010" },
    ]);
    cachePhoneCallSettings(ctx, readPhoneCallSettings(ctx));

    assert.equal(resolveDialTarget(ctx, "10086"), "alice");
    assert.equal(resolveDialTarget(ctx, "alice"), "alice");
    assert.equal(resolveDialTarget(ctx, "404"), null);
  });
});
