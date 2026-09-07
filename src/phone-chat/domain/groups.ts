/**
 * @file groups.ts
 * @description 作者群聊设置的规范化、查找与成员校验。
 */

import type {
  ChatGroupDefinition,
  ChatGroupMemberOverride,
} from "../types/index";

const MAX_GROUPS = 40;
const MAX_GROUP_MEMBERS = 8;

export function normalizeGroupDefinitions(rows: readonly unknown[]): ChatGroupDefinition[] {
  const result: ChatGroupDefinition[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (result.length >= MAX_GROUPS) break;
    if (!row || typeof row !== "object") continue;
    const raw = row as Record<string, unknown>;
    const id = String(raw.groupId ?? raw.id ?? "").trim().slice(0, 80);
    if (!id || seen.has(id)) continue;

    const memberCharacterIds: string[] = [];
    for (let index = 1; index <= MAX_GROUP_MEMBERS; index += 1) {
      const memberId = String(raw[`member${index}`] ?? "").trim();
      if (memberId && !memberCharacterIds.includes(memberId)) {
        memberCharacterIds.push(memberId);
      }
    }

    const title = String(raw.title ?? "").trim().slice(0, 80) || id;
    const avatarAsset = String(raw.avatarAsset ?? "").trim();
    result.push({
      id,
      title,
      ...(avatarAsset ? { avatarAsset } : {}),
      memberCharacterIds,
    });
    seen.add(id);
  }

  return result;
}

export function findGroupDefinition(
  groups: readonly ChatGroupDefinition[],
  groupId: string,
): ChatGroupDefinition | undefined {
  const id = groupId.trim();
  return groups.find((group) => group.id === id);
}

/** 规范化存档里的动态群成员变更，并合并重复群条目。 */
export function normalizeGroupMemberOverrides(
  rows: readonly unknown[],
): ChatGroupMemberOverride[] {
  const byGroupId = new Map<string, ChatGroupMemberOverride>();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const raw = row as Record<string, unknown>;
    const groupId = String(raw.groupId ?? "").trim().slice(0, 80);
    if (!groupId) continue;

    const current = byGroupId.get(groupId) ?? {
      groupId,
      addedCharacterIds: [],
      removedCharacterIds: [],
    };
    appendUniqueStrings(current.addedCharacterIds, raw.addedCharacterIds);
    appendUniqueStrings(current.removedCharacterIds, raw.removedCharacterIds);
    byGroupId.set(groupId, current);
  }

  return [...byGroupId.values()]
    .map((item) => {
      const removed = new Set(item.removedCharacterIds);
      return {
        groupId: item.groupId,
        addedCharacterIds: item.addedCharacterIds.filter(
          (characterId) => !removed.has(characterId),
        ),
        removedCharacterIds: item.removedCharacterIds,
      };
    })
    .filter(
      (item) =>
        item.addedCharacterIds.length > 0 || item.removedCharacterIds.length > 0,
    );
}

/** 将存档中的成员增删应用到作者设置，但不改动作者原始定义。 */
export function resolveGroupDefinitions(
  groups: readonly ChatGroupDefinition[],
  overrides: readonly ChatGroupMemberOverride[],
): ChatGroupDefinition[] {
  const overrideMap = new Map(
    normalizeGroupMemberOverrides(overrides).map((item) => [item.groupId, item]),
  );

  return groups.map((group) => {
    const override = overrideMap.get(group.id);
    if (!override) {
      return { ...group, memberCharacterIds: [...group.memberCharacterIds] };
    }

    const removed = new Set(override.removedCharacterIds);
    const memberCharacterIds = group.memberCharacterIds.filter(
      (characterId) => !removed.has(characterId),
    );
    for (const characterId of override.addedCharacterIds) {
      if (!memberCharacterIds.includes(characterId)) {
        memberCharacterIds.push(characterId);
      }
    }
    return { ...group, memberCharacterIds };
  });
}

function appendUniqueStrings(target: string[], value: unknown): void {
  if (!Array.isArray(value)) return;
  for (const item of value) {
    const characterId = String(item ?? "").trim();
    if (characterId && !target.includes(characterId)) target.push(characterId);
  }
}
