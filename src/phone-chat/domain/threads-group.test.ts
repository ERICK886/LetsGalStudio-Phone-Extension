import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendMessagesToConversation,
  clearConversationUnread,
} from "./threads.ts";

describe("group chat threads", () => {
  it("creates a group thread and preserves the incoming sender", () => {
    const result = appendMessagesToConversation(
      [],
      { kind: "group", groupId: "club" },
      [
        {
          text: "集合啦",
          direction: "incoming",
          status: "read",
          senderCharacterId: "alice",
        },
      ],
      { bumpUnread: true },
    );
    assert.equal(result.threads.length, 1);
    assert.equal(result.threads[0]!.kind, "group");
    assert.equal(result.threads[0]!.groupId, "club");
    assert.equal(result.threads[0]!.friendCharacterId, "");
    assert.equal(result.threads[0]!.unreadCount, 1);
    assert.equal(result.threads[0]!.messages[0]!.senderCharacterId, "alice");
  });

  it("updates only the addressed conversation and clears its unread count", () => {
    const first = appendMessagesToConversation(
      [],
      { kind: "direct", friendCharacterId: "alice" },
      [{ text: "hi", direction: "incoming", status: "read" }],
      { bumpUnread: true },
    ).threads;
    const second = appendMessagesToConversation(
      first,
      { kind: "group", groupId: "club" },
      [{ text: "yo", direction: "incoming", status: "read" }],
      { bumpUnread: true },
    ).threads;
    const cleared = clearConversationUnread(second, "group:club");
    assert.equal(cleared.find((thread) => thread.groupId === "club")!.unreadCount, 0);
    assert.equal(
      cleared.find((thread) => thread.friendCharacterId === "alice")!.unreadCount,
      1,
    );
  });
});
