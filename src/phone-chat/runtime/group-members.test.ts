import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  joinGroupMember,
  leaveGroupMember,
  listChatGroups,
} from "./actions.ts";
import { cacheAuthorSettings } from "./settings.ts";
import { bindChatSave } from "./store.ts";

describe("group member actions", () => {
  it("joins and leaves authored groups idempotently while retaining save deltas", () => {
    const values = new Map<string, unknown>();
    bindChatSave({
      get(key: string): unknown {
        return values.get(key);
      },
      set(key: string, value: unknown): void {
        values.set(key, value);
      },
    } as never);
    cacheAuthorSettings({
      selfCharacterId: "self",
      defaultFriends: [],
      defaultGroups: [
        {
          id: "club",
          title: "社团群",
          memberCharacterIds: ["alice"],
        },
      ],
      attributeFields: [],
      chatsTabLabel: "聊天",
      friendsTabLabel: "好友",
      emptyChatsHint: "暂无聊天",
      emptyFriendsHint: "暂无好友",
      appTitle: "聊天",
    });

    assert.equal(joinGroupMember("club", "bob"), true);
    assert.equal(joinGroupMember("club", "bob"), false);
    assert.deepEqual(listChatGroups()[0]!.memberCharacterIds, ["alice", "bob"]);

    assert.equal(leaveGroupMember("club", "alice"), true);
    assert.equal(leaveGroupMember("club", "alice"), false);
    assert.deepEqual(listChatGroups()[0]!.memberCharacterIds, ["bob"]);

    assert.equal(leaveGroupMember("club", "bob"), true);
    assert.deepEqual(listChatGroups()[0]!.memberCharacterIds, []);
    assert.deepEqual(values.get("groupMemberOverrides"), [
      {
        groupId: "club",
        addedCharacterIds: [],
        removedCharacterIds: ["alice"],
      },
    ]);

    assert.equal(joinGroupMember("club", "alice"), true);
    assert.deepEqual(values.get("groupMemberOverrides"), []);
    assert.equal(joinGroupMember("missing", "alice"), false);
  });
});
