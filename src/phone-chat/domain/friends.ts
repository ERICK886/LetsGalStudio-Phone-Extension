/**
 * @file friends.ts
 * @description 默认好友与动态增删合并。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

/**
 * 合并设置中的默认好友与存档增删，得到当前可见好友 ID 列表（去重、保序）。
 *
 * @param defaultFriends - 设置里的默认角色 ID
 * @param friendsExtra - 剧情添加的角色 ID
 * @param friendsRemoved - 剧情移除的角色 ID
 * @returns 可见好友 characterId 列表
 *
 * @example
 * ```ts
 * resolveFriendIds(["a", "b"], ["c"], ["b"]); // ["a", "c"]
 * ```
 */
export function resolveFriendIds(
  defaultFriends: readonly string[],
  friendsExtra: readonly string[],
  friendsRemoved: readonly string[],
): string[] {
  const removed = new Set(
    friendsRemoved.map((id) => id.trim()).filter(Boolean),
  );
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (raw: string) => {
    const id = raw.trim();
    if (!id || removed.has(id) || seen.has(id)) return;
    seen.add(id);
    result.push(id);
  };

  for (const id of defaultFriends) push(id);
  for (const id of friendsExtra) push(id);
  return result;
}

/**
 * 解析属性变量名模板。
 *
 * @param template - 如 `friend.{characterId}.mood`
 * @param characterId - 角色资产 ID
 * @returns 替换后的变量名；模板为空则返回空串
 */
export function resolveAttributeVariableKey(
  template: string,
  characterId: string,
): string {
  return template.split("{characterId}").join(characterId.trim());
}
