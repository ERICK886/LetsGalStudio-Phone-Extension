/**
 * @file chat-array-panels.tsx
 * @description 聊天编辑器：默认好友 / 属性槽 / 角色预设（含头像库）列表面板。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.3
 */

import React, { useMemo } from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import { AssetUriField, AssetUriThumb } from "../shared/asset-uri-field";
import { ColorPicker } from "../shared/color-picker";
import { EnumSelect } from "../shared/enum-select";
import { IconLabel } from "../shared/fa-icon";
import { useTheme, FONT_SIZE_DEFAULT, FONT_SIZE_TITLE } from "../theme/theme-provider";
import type { EditableChatAttribute } from "./chat-attributes-bridge";
import { formatCharacterListLabel, resolveCharacterName } from "./character-label";
import type { EditableChatFriend } from "./chat-friends-bridge";
import type {
  ChatAvatarSource,
  EditableChatAvatarAsset,
  EditableChatRolePreset,
} from "./chat-role-presets-bridge";

/**
 * 列表主标题：优先显示角色资产名称（否则缩短 id）。
 *
 * @param characterId - 资产角色 id
 * @returns 显示文案节点
 */
function CharacterPrimaryLabel({
  characterId,
}: {
  characterId: string;
}): React.ReactElement {
  const ctx = useExtensionContext();
  const all = ctx.character.useAll();
  const label = useMemo(
    () =>
      formatCharacterListLabel(characterId, all, (id) => ctx.character.get(id)),
    [all, characterId, ctx],
  );
  return <>{label}</>;
}

/**
 * 列表副标题：解析角色资产显示名（避免只显示 UUID）。
 *
 * @param characterId - 资产角色 id
 * @returns 显示文案
 */
function CharacterSubtitle({
  characterId,
}: {
  characterId: string;
}): React.ReactElement {
  const ctx = useExtensionContext();
  const id = characterId.trim();
  /** 多列表项时不要用 useCharacter(id)，会串成同一个角色 */
  const all = ctx.character.useAll();
  const name = useMemo(
    () => resolveCharacterName(id, all, (x) => ctx.character.get(x)),
    [all, ctx, id],
  );

  const fallback = !id
    ? "未绑角色"
    : id.length > 12
      ? `${id.slice(0, 8)}…`
      : id;

  return (
    <span style={{ fontSize: 10, opacity: 0.85 }}>
      {name ? name : `未解析 · ${fallback}`}
    </span>
  );
}

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
 * @returns 角色下拉
 *
 * @example
 * ```tsx
 * <CharacterAssetSelect
 *   value={preset.characterId}
 *   onChange={(id) => onChange({ characterId: id })}
 *   style={controlStyle}
 * />
 * ```
 */
function CharacterAssetSelect({
  value,
  onChange,
  style: _style,
  allowEmpty = true,
  emptyLabel = "（未选择角色）",
}: {
  value: string;
  onChange: (characterId: string) => void;
  style?: React.CSSProperties;
  allowEmpty?: boolean;
  emptyLabel?: string;
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
      placeholder={emptyLabel}
      ariaLabel="选择角色"
    />
  );
}

const labelStyleBase: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  marginBottom: 6,
};

/**
 * 通用字段容器。
 */
function Field({
  label,
  labelStyle,
  children,
}: {
  label: string;
  labelStyle: React.CSSProperties;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

/**
 * 空状态面板。
 */
function EmptyRight({ text }: { text: string }): React.ReactElement {
  const { tokens } = useTheme();
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        color: tokens.textMuted,
        padding: 12,
        background: tokens.bgElevated,
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
      }}
    >
      {text}
    </div>
  );
}

/* -------------------- 默认好友 -------------------- */

export interface ChatFriendsListProps {
  friends: readonly EditableChatFriend[];
  selectedUid: string;
  onSelect: (uid: string) => void;
  onAdd: () => void;
  onDelete: (uid: string) => void;
}

export function ChatFriendsList({
  friends,
  selectedUid,
  onSelect,
  onAdd,
  onDelete,
}: ChatFriendsListProps): React.ReactElement {
  const { tokens } = useTheme();
  return (
    <ArrayListShell
      title="默认好友"
      onAdd={onAdd}
      onDelete={() => selectedUid && onDelete(selectedUid)}
      deleteDisabled={!selectedUid}
    >
      {friends.map((friend) => {
        const active = friend.uid === selectedUid;
        return (
          <button
            key={friend.uid}
            type="button"
            onClick={() => onSelect(friend.uid)}
            style={rowButtonStyle(tokens, active)}
          >
            <span style={{ fontWeight: active ? 600 : 400 }}>
              <CharacterPrimaryLabel characterId={friend.characterId} />
            </span>
            <span style={{ fontSize: 10, opacity: 0.85 }}>默认好友</span>
          </button>
        );
      })}
    </ArrayListShell>
  );
}

export function ChatFriendsPropertyPanel({
  friend,
  onChange,
}: {
  friend: EditableChatFriend | null;
  onChange: (patch: Partial<EditableChatFriend>) => void;
}): React.ReactElement {
  const { tokens } = useTheme();
  const labelStyle = { ...labelStyleBase, color: tokens.textSecondary };
  const controlStyle = controlStyleOf(tokens);
  if (!friend) return <EmptyRight text="请选择一个好友" />;
  return (
    <RightShell title="好友属性" tokens={tokens}>
      <Field label="资产角色" labelStyle={labelStyle}>
        <CharacterAssetSelect
          value={friend.characterId}
          onChange={(characterId) => onChange({ characterId })}
          style={controlStyle}
          emptyLabel="（未选择角色）"
        />
      </Field>
      <Hint tokens={tokens}>写入 phone-chat · defaultFriends</Hint>
    </RightShell>
  );
}

/* -------------------- 属性槽 -------------------- */

export interface ChatAttributesListProps {
  fields: readonly EditableChatAttribute[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export function ChatAttributesList(props: ChatAttributesListProps): React.ReactElement {
  const { tokens } = useTheme();
  return (
    <ArrayListShell
      title="好友属性槽"
      onAdd={props.onAdd}
      onDelete={() => props.selectedId && props.onDelete(props.selectedId)}
      deleteDisabled={!props.selectedId || props.fields.length <= 1}
    >
      {props.fields.map((field) => {
        const active = field.id === props.selectedId;
        return (
          <button
            key={field.id}
            type="button"
            onClick={() => props.onSelect(field.id)}
            style={rowButtonStyle(tokens, active)}
          >
            <span style={{ fontWeight: active ? 600 : 400 }}>{field.label}</span>
            <span style={{ fontSize: 10, color: tokens.textMuted }}>{field.id}</span>
          </button>
        );
      })}
    </ArrayListShell>
  );
}

export function ChatAttributesPropertyPanel({
  field,
  onChange,
}: {
  field: EditableChatAttribute | null;
  onChange: (patch: Partial<EditableChatAttribute>) => void;
}): React.ReactElement {
  const { tokens } = useTheme();
  const labelStyle = { ...labelStyleBase, color: tokens.textSecondary };
  const controlStyle = controlStyleOf(tokens);
  if (!field) return <EmptyRight text="请选择一个属性槽" />;
  return (
    <RightShell title="属性槽" tokens={tokens}>
      <Field label="槽位 ID" labelStyle={labelStyle}>
        <input
          type="text"
          style={controlStyle}
          value={field.id}
          onChange={(e) => onChange({ id: e.target.value })}
        />
      </Field>
      <Field label="显示名称" labelStyle={labelStyle}>
        <input
          type="text"
          style={controlStyle}
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </Field>
      <Field label="变量名" labelStyle={labelStyle}>
        <input
          type="text"
          style={controlStyle}
          value={field.variableKey}
          onChange={(e) => onChange({ variableKey: e.target.value })}
          placeholder="friend.{characterId}.mood"
        />
      </Field>
      <Hint tokens={tokens}>写入 phone-chat · attributeFields</Hint>
    </RightShell>
  );
}

/* -------------------- 角色预设 / 头像库 -------------------- */

export type ChatRoleSubMode = "presets" | "avatars";

export function ChatRolePresetsList({
  mode,
  onModeChange,
  presets,
  avatars,
  selectedPresetId,
  selectedAvatarId,
  onSelectPreset,
  onSelectAvatar,
  onAdd,
  onDelete,
}: {
  mode: ChatRoleSubMode;
  onModeChange: (mode: ChatRoleSubMode) => void;
  presets: readonly EditableChatRolePreset[];
  avatars: readonly EditableChatAvatarAsset[];
  selectedPresetId: string;
  selectedAvatarId: string;
  onSelectPreset: (id: string) => void;
  onSelectAvatar: (id: string) => void;
  onAdd: () => void;
  onDelete: () => void;
}): React.ReactElement {
  const { tokens } = useTheme();
  const items = mode === "presets" ? presets : avatars;
  const selectedId = mode === "presets" ? selectedPresetId : selectedAvatarId;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minHeight: 0,
      }}
    >
      <div style={{ display: "flex", gap: 4, padding: "0 4px" }}>
        {(
          [
            { id: "presets" as const, label: "角色预设" },
            { id: "avatars" as const, label: "头像素材库" },
          ]
        ).map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onModeChange(tab.id)}
              style={{
                flex: 1,
                height: 28,
                borderRadius: 4,
                border: `1px solid ${active ? tokens.accent : tokens.border}`,
                background: active ? `${tokens.accent}22` : tokens.bgSunken,
                color: active ? tokens.textPrimary : tokens.textSecondary,
                cursor: "pointer",
                fontSize: FONT_SIZE_DEFAULT,
                fontWeight: active ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ArrayListShell
          title={mode === "presets" ? "消息角色预设" : "聊天头像素材库"}
          onAdd={onAdd}
          onDelete={onDelete}
          deleteDisabled={!selectedId}
        >
          {mode === "presets"
            ? presets.map((preset) => {
                const active = preset.id === selectedPresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPreset(preset.id)}
                    style={rowButtonStyle(tokens, active)}
                  >
                    <span style={{ fontWeight: active ? 600 : 400 }}>
                      {preset.id}
                    </span>
                    <CharacterSubtitle characterId={preset.characterId} />
                  </button>
                );
              })
            : avatars.map((avatar) => {
                const active = avatar.id === selectedAvatarId;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => onSelectAvatar(avatar.id)}
                    style={{
                      ...rowButtonStyle(tokens, active),
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      textAlign: "left",
                    }}
                  >
                    <AssetUriThumb uri={avatar.asset} size={28} tokens={tokens} />
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <span style={{ fontWeight: active ? 600 : 400 }}>
                        {avatar.id}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: tokens.textMuted,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {avatar.asset || "未填素材"}
                      </span>
                    </span>
                  </button>
                );
              })}
          {items.length === 0 ? (
            <div style={{ padding: 12, color: tokens.textMuted, fontSize: 12 }}>
              暂无条目，点击下方添加。
            </div>
          ) : null}
        </ArrayListShell>
      </div>
    </div>
  );
}

export function ChatRolePresetPropertyPanel({
  preset,
  onChange,
}: {
  preset: EditableChatRolePreset | null;
  onChange: (patch: Partial<EditableChatRolePreset>) => void;
}): React.ReactElement {
  const { tokens } = useTheme();
  const labelStyle = { ...labelStyleBase, color: tokens.textSecondary };
  const controlStyle = controlStyleOf(tokens);
  if (!preset) return <EmptyRight text="请选择一个角色预设" />;

  const avatarSourceOptions = [
    { value: "first-portrait", label: "第一张立绘" },
    { value: "character-avatar", label: "角色头像" },
    { value: "asset", label: "扩展素材库" },
  ] as const;

  return (
    <RightShell title="角色预设" tokens={tokens}>
      <Field label="预设 ID" labelStyle={labelStyle}>
        <input
          type="text"
          style={controlStyle}
          value={preset.id}
          onChange={(e) => onChange({ id: e.target.value })}
        />
      </Field>
      <Field label="资产角色" labelStyle={labelStyle}>
        <CharacterAssetSelect
          value={preset.characterId}
          onChange={(characterId) => onChange({ characterId })}
          style={controlStyle}
          emptyLabel="（未选择角色）"
        />
      </Field>
      <Field label="头像来源" labelStyle={labelStyle}>
        <EnumSelect
          value={preset.avatarSource}
          onChange={(next) =>
            onChange({ avatarSource: next as ChatAvatarSource })
          }
          options={avatarSourceOptions}
          clearable={false}
          filterable={false}
          ariaLabel="头像来源"
          placeholder="请选择"
        />
      </Field>
      {preset.avatarSource === "asset" ? (
        <Field label="头像素材 ID" labelStyle={labelStyle}>
          <input
            type="text"
            style={controlStyle}
            value={preset.avatarAssetId}
            onChange={(e) => onChange({ avatarAssetId: e.target.value })}
            placeholder="对应头像库中的 id"
          />
        </Field>
      ) : null}
      <BooleanField
        checked={preset.showAvatar}
        onChange={(v) => onChange({ showAvatar: v })}
        label="显示头像"
        tokens={tokens}
      />
      <BooleanField
        checked={preset.showName}
        onChange={(v) => onChange({ showName: v })}
        label="显示名称"
        tokens={tokens}
      />
      <Field label="字体大小" labelStyle={labelStyle}>
        <input
          type="text"
          style={controlStyle}
          value={preset.fontSize}
          onChange={(e) => onChange({ fontSize: e.target.value })}
        />
      </Field>
      <Field label="文字颜色" labelStyle={labelStyle}>
        <ColorPicker
          value={preset.textColor}
          onChange={(v) => onChange({ textColor: v })}
          allowAlpha
          tokens={tokens}
        />
      </Field>
      <Field label="名称颜色" labelStyle={labelStyle}>
        <ColorPicker
          value={preset.nameColor}
          onChange={(v) => onChange({ nameColor: v })}
          allowAlpha
          tokens={tokens}
        />
      </Field>
      <Field label="对话框颜色" labelStyle={labelStyle}>
        <ColorPicker
          value={preset.bubbleColor}
          onChange={(v) => onChange({ bubbleColor: v })}
          allowAlpha
          tokens={tokens}
        />
      </Field>
      <Field label="自定义 CSS" labelStyle={labelStyle}>
        <textarea
          style={{ ...controlStyle, minHeight: 72, resize: "vertical" }}
          value={preset.customCss}
          onChange={(e) => onChange({ customCss: e.target.value })}
          rows={4}
          placeholder="优先于结构化颜色/字号"
        />
      </Field>
      <Hint tokens={tokens}>写入 phone · chatRolePresets</Hint>
    </RightShell>
  );
}

export function ChatAvatarAssetPropertyPanel({
  asset,
  onChange,
}: {
  asset: EditableChatAvatarAsset | null;
  onChange: (patch: Partial<EditableChatAvatarAsset>) => void;
}): React.ReactElement {
  const { tokens } = useTheme();
  const labelStyle = { ...labelStyleBase, color: tokens.textSecondary };
  const controlStyle = controlStyleOf(tokens);
  if (!asset) return <EmptyRight text="请选择一个头像素材" />;
  return (
    <RightShell title="头像素材" tokens={tokens}>
      <Field label="素材 ID" labelStyle={labelStyle}>
        <input
          type="text"
          style={controlStyle}
          value={asset.id}
          onChange={(e) => onChange({ id: e.target.value })}
        />
      </Field>
      <Field label="素材 URI / 引用" labelStyle={labelStyle}>
        <AssetUriField
          value={asset.asset}
          onChange={(next) => onChange({ asset: next })}
          placeholder="图片素材 URI"
          ariaLabel="头像素材 URI"
          tokens={tokens}
        />
      </Field>
      <Hint tokens={tokens}>写入 phone · chatAvatarAssets</Hint>
    </RightShell>
  );
}

/* -------------------- 布局零件 -------------------- */

function ArrayListShell({
  title,
  children,
  onAdd,
  onDelete,
  deleteDisabled,
}: {
  title: string;
  children: React.ReactNode;
  onAdd: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
}): React.ReactElement {
  const { tokens } = useTheme();
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 4,
        overflow: "hidden",
        background: tokens.bgElevated,
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.4,
          color: tokens.textMuted,
          padding: "4px 8px 0",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {children}
      </div>
      <div style={{ display: "flex", gap: 6, padding: "0 4px 4px" }}>
        <button type="button" onClick={onAdd} style={footerBtn(tokens, false)}>
          <IconLabel icon="plus">添加</IconLabel>
        </button>
        <button
          type="button"
          disabled={deleteDisabled}
          onClick={onDelete}
          style={footerBtn(tokens, deleteDisabled)}
        >
          <IconLabel icon="trash">删除</IconLabel>
        </button>
      </div>
    </div>
  );
}

function RightShell({
  title,
  tokens,
  children,
}: {
  title: string;
  tokens: ReturnType<typeof useTheme>["tokens"];
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 12,
        overflow: "auto",
        background: tokens.bgElevated,
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontSize: FONT_SIZE_TITLE,
          fontWeight: 600,
          color: tokens.textPrimary,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Hint({
  tokens,
  children,
}: {
  tokens: ReturnType<typeof useTheme>["tokens"];
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={{
        marginTop: "auto",
        fontSize: 11,
        color: tokens.textMuted,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function controlStyleOf(
  tokens: ReturnType<typeof useTheme>["tokens"],
): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 9px",
    borderRadius: 4,
    fontSize: FONT_SIZE_DEFAULT,
    outline: "none",
    color: tokens.textPrimary,
    background: tokens.bgSunken,
    border: `1px solid ${tokens.border}`,
  };
}

function BooleanField({
  checked,
  onChange,
  label,
  tokens,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tokens: ReturnType<typeof useTheme>["tokens"];
}): React.ReactElement {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: FONT_SIZE_DEFAULT,
        color: tokens.textPrimary,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function rowButtonStyle(
  tokens: ReturnType<typeof useTheme>["tokens"],
  active: boolean,
): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    borderRadius: 4,
    border: `1px solid ${active ? tokens.accent : "transparent"}`,
    background: active ? `${tokens.accent}22` : "transparent",
    color: active ? tokens.textPrimary : tokens.textSecondary,
    cursor: "pointer",
    fontSize: FONT_SIZE_DEFAULT,
  };
}

function footerBtn(
  tokens: ReturnType<typeof useTheme>["tokens"],
  disabled: boolean,
): React.CSSProperties {
  return {
    flex: 1,
    height: 30,
    borderRadius: 4,
    border: `1px solid ${tokens.border}`,
    background: tokens.bgSunken,
    color: tokens.textPrimary,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontSize: 12,
  };
}

function checkStyle(
  tokens: ReturnType<typeof useTheme>["tokens"],
): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: tokens.textSecondary,
    fontSize: FONT_SIZE_DEFAULT,
    cursor: "pointer",
  };
}
