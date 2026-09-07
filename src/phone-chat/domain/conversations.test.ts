import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  conversationIdForPending,
  conversationIdForThread,
  directConversationId,
  groupConversationId,
  parseConversationId,
} from "./conversations.ts";

describe("chat conversation ids", () => {
  it("keeps legacy direct threads addressable", () => {
    assert.equal(
      conversationIdForThread({
        friendCharacterId: "alice",
        messages: [],
        updatedAt: 0,
        unreadCount: 0,
      }),
      "direct:alice",
    );
    assert.deepEqual(parseConversationId("direct:alice"), {
      kind: "direct",
      friendCharacterId: "alice",
    });
  });

  it("addresses group threads and pending replies by stable group id", () => {
    assert.equal(groupConversationId(" club "), "group:club");
    assert.equal(
      conversationIdForThread({
        kind: "group",
        friendCharacterId: "",
        groupId: "club",
        messages: [],
        updatedAt: 0,
        unreadCount: 0,
      }),
      "group:club",
    );
    assert.equal(
      conversationIdForPending({
        friendCharacterId: "",
        groupId: "club",
        options: [],
      }),
      "group:club",
    );
  });

  it("rejects empty or unknown conversation ids", () => {
    assert.equal(directConversationId(" "), "");
    assert.equal(parseConversationId("group:"), null);
    assert.equal(parseConversationId("alice"), null);
  });
});
