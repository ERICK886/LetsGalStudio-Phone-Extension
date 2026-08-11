/**
 * @file character-label.ts
 * @description 编辑器：将资产角色 ID 解析为可读显示名。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

/**
 * 可解析角色显示名的最小角色形状。
 */
export interface CharacterNameSource {
  id: string;
  name?: string;
}

/**
 * 按 id 查找角色显示名。
 *
 * @param characterId - 资产角色 id（UUID 或其它）
 * @param characters - 角色列表（通常来自 `ctx.character.useAll()` / `list()`）
 * @param getById - 可选同步查询（`ctx.character.get`），优先于列表扫描
 * @returns 去空白后的名称；找不到或名为空时返回 `null`
 *
 * @example
 * ```ts
 * const name = resolveCharacterName(id, ctx.character.useAll(), (x) => ctx.character.get(x));
 * // "我" 或 null
 * ```
 */
export function resolveCharacterName(
  characterId: string,
  characters: readonly CharacterNameSource[],
  getById?: (id: string) => CharacterNameSource | null | undefined,
): string | null {
  const id = characterId.trim();
  if (!id) return null;
  const hit =
    getById?.(id) ?? characters.find((item) => item.id === id) ?? null;
  const name = hit?.name?.trim();
  return name || null;
}

/**
 * 列表 / 预览用主标题：有名称用名称，否则缩短显示 id。
 *
 * @param characterId - 资产角色 id
 * @param characters - 角色列表
 * @param getById - 可选 get
 * @returns 展示文案（永不空：空 id 为「未绑角色」）
 *
 * @example
 * ```ts
 * formatCharacterListLabel(uuid, all); // "我"
 * formatCharacterListLabel("unknown", all); // "unknown" 或截断
 * ```
 */
export function formatCharacterListLabel(
  characterId: string,
  characters: readonly CharacterNameSource[],
  getById?: (id: string) => CharacterNameSource | null | undefined,
): string {
  const id = characterId.trim();
  if (!id) return "未绑角色";
  const name = resolveCharacterName(id, characters, getById);
  if (name) return name;
  if (id.length > 12) return `${id.slice(0, 8)}…`;
  return id;
}
