/**
 * @file chat-group-panels.tsx
 * @description 聊天编辑器群聊列表与属性面板。
 */

import React from "react";

import { AssetUriField } from "../shared/asset-uri-field";
import { CharacterAssetSelect } from "../shared/character-select";
import { IconLabel } from "../shared/fa-icon";
import { FONT_SIZE_DEFAULT, useTheme } from "../theme/theme-provider";
import type { EditableChatGroup } from "./chat-groups-bridge";
import { ChakraButton, ChakraDiv, ChakraInput, ChakraLabel, ChakraSpan } from "../shared/chakra-elements";

export function ChatGroupsList(props: {
  groups: readonly EditableChatGroup[];
  selectedUid: string;
  onSelect: (uid: string) => void;
  onAdd: () => void;
  onDelete: (uid: string) => void;
}): React.ReactElement {
  const { tokens } = useTheme();
  return (
    <ChakraDiv style={shellStyle(tokens)}>
      <ChakraDiv style={{ fontSize: 11, fontWeight: 600, color: tokens.textMuted }}>
        默认群聊
      </ChakraDiv>
      <ChakraDiv style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
        {props.groups.map((group) => {
          const active = group.uid === props.selectedUid;
          return (
            <ChakraButton
              key={group.uid}
              type="button"
              onClick={() => props.onSelect(group.uid)}
              style={rowStyle(tokens, active)}
            >
              <ChakraSpan style={{ fontWeight: active ? 600 : 400 }}>{group.title}</ChakraSpan>
              <ChakraSpan style={{ fontSize: 10, opacity: 0.8 }}>
                {group.groupId} · {group.memberCharacterIds.length} 名成员
              </ChakraSpan>
            </ChakraButton>
          );
        })}
      </ChakraDiv>
      <ChakraDiv style={{ display: "flex", gap: 6 }}>
        <ChakraButton type="button" onClick={props.onAdd} style={footerStyle(tokens)}>
          <IconLabel icon="plus">添加</IconLabel>
        </ChakraButton>
        <ChakraButton
          type="button"
          disabled={!props.selectedUid}
          onClick={() => props.selectedUid && props.onDelete(props.selectedUid)}
          style={{ ...footerStyle(tokens), opacity: props.selectedUid ? 1 : 0.5 }}
        >
          <IconLabel icon="trash">删除</IconLabel>
        </ChakraButton>
      </ChakraDiv>
    </ChakraDiv>
  );
}

export function ChatGroupPropertyPanel(props: {
  group: EditableChatGroup | null;
  onChange: (patch: Partial<EditableChatGroup>) => void;
}): React.ReactElement {
  const { tokens } = useTheme();
  if (!props.group) {
    return <ChakraDiv style={shellStyle(tokens)}>请选择一个群聊</ChakraDiv>;
  }

  const controlStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 9px",
    borderRadius: 4,
    border: `1px solid ${tokens.border}`,
    background: tokens.bgSunken,
    color: tokens.textPrimary,
    fontSize: FONT_SIZE_DEFAULT,
  };
  const members = Array.from(
    { length: 8 },
    (_, index) => props.group?.memberCharacterIds[index] ?? "",
  );

  return (
    <ChakraDiv style={{ ...shellStyle(tokens), overflow: "auto" }}>
      <Field label="群 ID" color={tokens.textSecondary}>
        <ChakraInput
          value={props.group.groupId}
          onChange={(event) => props.onChange({ groupId: event.target.value })}
          style={controlStyle}
        />
      </Field>
      <Field label="群名称" color={tokens.textSecondary}>
        <ChakraInput
          value={props.group.title}
          onChange={(event) => props.onChange({ title: event.target.value })}
          style={controlStyle}
        />
      </Field>
      <Field label="群头像" color={tokens.textSecondary}>
        <AssetUriField
          value={props.group.avatarAsset}
          onChange={(avatarAsset) => props.onChange({ avatarAsset })}
          placeholder="图片素材 URI"
          ariaLabel="群头像素材 URI"
          tokens={tokens}
        />
      </Field>
      {members.map((memberId, index) => (
        <Field key={index} label={`成员 ${index + 1}`} color={tokens.textSecondary}>
          <CharacterAssetSelect
            value={memberId}
            onChange={(characterId) => {
              const next = [...members];
              next[index] = characterId;
              props.onChange({ memberCharacterIds: next });
            }}
            style={controlStyle}
            emptyLabel="（未选择角色）"
          />
        </Field>
      ))}
      <ChakraDiv style={{ marginTop: "auto", color: tokens.textMuted, fontSize: 11 }}>
        写入 phone-chat · defaultGroups
      </ChakraDiv>
    </ChakraDiv>
  );
}

function Field(props: {
  label: string;
  color: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ChakraDiv>
      <ChakraLabel style={{ display: "block", marginBottom: 6, color: props.color, fontSize: 11, fontWeight: 600 }}>
        {props.label}
      </ChakraLabel>
      {props.children}
    </ChakraDiv>
  );
}

function shellStyle(tokens: ReturnType<typeof useTheme>["tokens"]): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 10,
    overflow: "hidden",
    background: tokens.bgElevated,
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    color: tokens.textPrimary,
  };
}

function rowStyle(
  tokens: ReturnType<typeof useTheme>["tokens"],
  active: boolean,
): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    width: "100%",
    marginBottom: 4,
    padding: "8px 10px",
    borderRadius: 4,
    border: `1px solid ${active ? tokens.accent : "transparent"}`,
    background: active ? `${tokens.accent}22` : "transparent",
    color: active ? tokens.textPrimary : tokens.textSecondary,
    cursor: "pointer",
    textAlign: "left",
  };
}

function footerStyle(tokens: ReturnType<typeof useTheme>["tokens"]): React.CSSProperties {
  return {
    flex: 1,
    height: 30,
    borderRadius: 4,
    border: `1px solid ${tokens.border}`,
    background: tokens.bgSunken,
    color: tokens.textPrimary,
    cursor: "pointer",
  };
}
