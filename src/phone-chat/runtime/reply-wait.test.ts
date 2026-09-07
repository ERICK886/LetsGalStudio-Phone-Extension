import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHONE_SDK_GLOBAL_KEY,
  isPhoneCloseLocked,
} from "@ink-zenly/phone-sdk/plugin";

import {
  createReplyWait,
  resolveReplyWaitsForConversation,
} from "./reply-wait.ts";

describe("chat reply waits", () => {
  it("resolves only the addressed conversation", async () => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
    const direct = createReplyWait("direct:alice");
    const group = createReplyWait("group:club");
    assert.equal(isPhoneCloseLocked(), true);
    let directResolved = false;
    let groupResolved = false;
    void direct.promise.then(() => {
      directResolved = true;
    });
    void group.promise.then(() => {
      groupResolved = true;
    });

    resolveReplyWaitsForConversation("group:club");
    await Promise.resolve();
    assert.equal(groupResolved, true);
    assert.equal(directResolved, false);
    assert.equal(isPhoneCloseLocked(), true);

    resolveReplyWaitsForConversation();
    await Promise.resolve();
    assert.equal(directResolved, true);
    assert.equal(isPhoneCloseLocked(), false);
  });

  it("resolves a wait when the engine flow is aborted", async () => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
    const controller = new AbortController();
    const wait = createReplyWait("direct:alice", controller.signal);
    assert.equal(isPhoneCloseLocked(), true);
    let resolved = false;
    void wait.promise.then(() => {
      resolved = true;
    });

    controller.abort();
    await wait.promise;
    assert.equal(resolved, true);
    assert.equal(isPhoneCloseLocked(), false);
  });
});
