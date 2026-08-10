/**
 * @file FriendDetailScreen.tsx
 * @description 好友详情：头像、名字、属性行、发消息入口。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React from "react";

import { resolveAttributeVariableKey } from "../../domain/friends";
import { getCachedAuthorSettings } from "../../runtime/settings";
import { AppHeader, Avatar } from "../components/index";
import { useCharacterView } from "../hooks/useCharacterView";

export interface FriendDetailScreenProps {
  friendCharacterId: string;
  onBack: () => void;
  onOpenChat: () => void;
}

/**
 * @param props - FriendDetailScreenProps
 * @returns 详情页节点
 */
export function FriendDetailScreen(props: FriendDetailScreenProps) {
  const ctx = useExtensionContext();
  const view = useCharacterView(ctx, props.friendCharacterId);
  const settings = getCachedAuthorSettings();

  const rows = settings.attributeFields.map((field) => {
    const key = resolveAttributeVariableKey(
      field.variableKey,
      props.friendCharacterId,
    );
    const value = key ? ctx.variables.get(key) : undefined;
    return {
      id: field.id,
      label: field.label,
      display: value === undefined || value === null ? "—" : String(value),
    };
  });

  return (
    <div className="chat-detail">
      <AppHeader title="详细资料" onBack={props.onBack} />

      <div className="chat-detail-hero">
        <Avatar
          className="chat-avatar"
          url={view.avatarUrl}
          glyph={view.glyph}
        />
        <div className="chat-detail-name">{view.name}</div>
      </div>

      {rows.map((row) => (
        <div key={row.id} className="chat-detail-row">
          <span className="chat-detail-label">{row.label}</span>
          <span className="chat-detail-value">{row.display}</span>
        </div>
      ))}

      <div className="chat-detail-actions">
        <button
          type="button"
          className="chat-primary"
          onClick={props.onOpenChat}
        >
          发消息
        </button>
      </div>
    </div>
  );
}
