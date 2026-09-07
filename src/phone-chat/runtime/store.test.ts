import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bindChatSave, patchChatState, readChatState } from "./store.ts";

describe("chat save normalization", () => {
  it("defends malformed lists and deeply clones patched threads", () => {
    const values = new Map<string, unknown>([
      ["friendsExtra", "not-a-list"],
      ["friendsRemoved", [" alice ", "alice", null]],
      [
        "groupMemberOverrides",
        [
          {
            groupId: " club ",
            addedCharacterIds: ["bob", "bob"],
            removedCharacterIds: ["alice"],
          },
        ],
      ],
      [
        "threads",
        [
          {
            kind: "group",
            friendCharacterId: "should-clear",
            groupId: " club ",
            messages: [
              {
                id: 1,
                text: 2,
                direction: "invalid",
                status: "invalid",
                createdAt: "invalid",
              },
            ],
            updatedAt: "invalid",
            unreadCount: -3,
          },
        ],
      ],
      [
        "pendingReplies",
        [
          {
            conversationId: " group:club ",
            friendCharacterId: null,
            groupId: "club",
            options: [
              {
                id: 3,
                text: 4,
                effects: [{ variable: 5, value: 6 }],
              },
            ],
            outgoingStatus: "invalid",
          },
        ],
      ],
    ]);
    const api = {
      get(key: string): unknown {
        return values.get(key);
      },
      set(key: string, value: unknown): void {
        values.set(key, value);
      },
    };

    bindChatSave(api as never);
    const state = readChatState();
    assert.deepEqual(state.friendsExtra, []);
    assert.deepEqual(state.friendsRemoved, ["alice"]);
    assert.deepEqual(state.groupMemberOverrides, [
      {
        groupId: "club",
        addedCharacterIds: ["bob"],
        removedCharacterIds: ["alice"],
      },
    ]);
    assert.equal(state.threads[0]!.friendCharacterId, "");
    assert.equal(state.threads[0]!.groupId, "club");
    assert.equal(state.threads[0]!.unreadCount, 0);
    assert.equal(state.threads[0]!.messages[0]!.status, "read");
    assert.equal(state.pendingReplies[0]!.outgoingStatus, "read");
    assert.deepEqual(state.pendingReplies[0]!.options[0]!.effects, [
      { variable: "5", value: "6" },
    ]);

    patchChatState({ threads: state.threads }, "test-clone");
    state.threads[0]!.messages[0]!.text = "mutated outside store";
    state.groupMemberOverrides[0]!.addedCharacterIds.push("outside");
    assert.equal(readChatState().threads[0]!.messages[0]!.text, "2");
    assert.deepEqual(
      readChatState().groupMemberOverrides[0]!.addedCharacterIds,
      ["bob"],
    );
  });
});
