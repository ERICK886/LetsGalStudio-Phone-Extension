import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findGroupDefinition,
  normalizeGroupDefinitions,
  normalizeGroupMemberOverrides,
  resolveGroupDefinitions,
} from "./groups.ts";

describe("normalizeGroupDefinitions", () => {
  it("trims values, removes duplicate members and keeps the first duplicate id", () => {
    const groups = normalizeGroupDefinitions([
      {
        groupId: " club ",
        title: "  社团群  ",
        avatarAsset: " asset://club ",
        member1: "alice",
        member2: "alice",
        member3: " bob ",
      },
      { groupId: "club", title: "重复" },
    ]);
    assert.deepEqual(groups, [
      {
        id: "club",
        title: "社团群",
        avatarAsset: "asset://club",
        memberCharacterIds: ["alice", "bob"],
      },
    ]);
    assert.equal(findGroupDefinition(groups, " club ")?.title, "社团群");
  });

  it("skips invalid rows and falls back title to id", () => {
    assert.deepEqual(normalizeGroupDefinitions([null, {}, { id: "team" }]), [
      { id: "team", title: "team", memberCharacterIds: [] },
    ]);
  });
});

describe("dynamic group members", () => {
  it("normalizes duplicate overrides and lets removals win malformed conflicts", () => {
    assert.deepEqual(
      normalizeGroupMemberOverrides([
        {
          groupId: " club ",
          addedCharacterIds: ["bob", "bob", "carol"],
          removedCharacterIds: ["alice"],
        },
        {
          groupId: "club",
          addedCharacterIds: ["alice"],
          removedCharacterIds: ["carol"],
        },
      ]),
      [
        {
          groupId: "club",
          addedCharacterIds: ["bob"],
          removedCharacterIds: ["alice", "carol"],
        },
      ],
    );
  });

  it("resolves saved additions and removals without mutating author groups", () => {
    const groups = [
      {
        id: "club",
        title: "社团群",
        memberCharacterIds: ["alice", "carol"],
      },
    ];
    const resolved = resolveGroupDefinitions(groups, [
      {
        groupId: "club",
        addedCharacterIds: ["bob"],
        removedCharacterIds: ["alice"],
      },
      {
        groupId: "missing",
        addedCharacterIds: ["nobody"],
        removedCharacterIds: [],
      },
    ]);

    assert.deepEqual(resolved[0]!.memberCharacterIds, ["carol", "bob"]);
    assert.deepEqual(groups[0]!.memberCharacterIds, ["alice", "carol"]);
  });
});
