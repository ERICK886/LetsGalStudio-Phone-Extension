/**
 * @file character-select.tsx
 * @description 项目资产角色下拉选择（基于 `ctx.character.useAll()`）。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */

import React, { useMemo } from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import { EnumSelect } from "./enum-select";

/**
 * 项目资产角色下拉选择（基于 `ctx.character.useAll()`）。
 *
 * Studio 设置 schema 的 `item.character()` 在宿主属性面板里自带选择器；
 * 自定义编辑器没有现成控件，因此用角色列表做成可点选下拉。
 *
 * @param value - 当前角色 id（可为空）
 * @param onChange - 选中变更
 * @param style - 保留兼容；EnumSelect 自带宽度 100% 样式
 * @param allowEmpty - 是否允许「未选择」
 * @param emptyLabel - 空选项文案
 * @param disabled - 是否禁用
 * @returns 角色下拉
 *
 * @example
 * ```tsx
 * <CharacterAssetSelect
 *   value={preset.characterId}
 *   onChange={(id) => onChange({ characterId: id })}
 * />
 * ```
 */
export function CharacterAssetSelect({
  value,
  onChange,
  style: _style,
  allowEmpty = true,
  emptyLabel = "（未选择角色）",
  disabled = false,
}: {
  value: string;
  onChange: (characterId: string) => void;
  style?: React.CSSProperties;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}): React.ReactElement {
  const ctx = useExtensionContext();
  const characters = ctx.character.useAll();
  const current = value.trim();

  /** 当前值不在列表中时，仍展示一项，避免静默丢失已有绑定 */
  const orphan =
    current && !characters.some((c) => c.id === current)
      ? current
      : "";

  const options = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (allowEmpty) opts.push({ value: "", label: emptyLabel });
    if (orphan)
      opts.push({
        value: orphan,
        label: `（未找到）${orphan.length > 16 ? `${orphan.slice(0, 12)}…` : orphan}`,
      });
    characters.forEach((c) =>
      opts.push({ value: c.id, label: c.name?.trim() ? c.name : c.id }),
    );
    return opts;
  }, [allowEmpty, characters, emptyLabel, orphan]);

  return (
    <EnumSelect
      value={current}
      onChange={onChange}
      options={options}
      clearable={allowEmpty}
      filterable
      disabled={disabled}
      placeholder={emptyLabel}
      ariaLabel="选择角色"
    />
  );
}
