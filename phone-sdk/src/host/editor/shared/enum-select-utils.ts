/**
 * @file enum-select-utils.ts
 * @description EnumSelect 纯逻辑：过滤、orphan 合并、展示文案。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */

export interface EnumSelectOption {
  value: string;
  label: string;
}

/** 按 label/value 本地包含匹配（大小写不敏感）。 */
export function filterEnumOptions(
  options: readonly EnumSelectOption[],
  query: string,
): EnumSelectOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options];
  return options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      o.value.toLowerCase().includes(q),
  );
}

/**
 * 若 value 非空且不在 options 中，在列表头部追加 orphan 项。
 * orphan label：`(未找到)` + 缩短 id。
 */
export function mergeOrphanOption(
  options: readonly EnumSelectOption[],
  value: string,
): EnumSelectOption[] {
  const v = value.trim();
  if (!v || options.some((o) => o.value === v)) return [...options];
  const short = v.length > 16 ? `${v.slice(0, 12)}…` : v;
  return [{ value: v, label: `（未找到）${short}` }, ...options];
}

/** 触发器展示文案。 */
export function resolveEnumLabel(
  options: readonly EnumSelectOption[],
  value: string,
  placeholder = "请选择",
): string {
  if (!value) return placeholder;
  return options.find((o) => o.value === value)?.label ?? value;
}
