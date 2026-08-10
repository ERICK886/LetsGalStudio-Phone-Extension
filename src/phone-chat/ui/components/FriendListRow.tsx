/**
 * @file FriendListRow.tsx
 * @description 好友列表单行。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React from "react";

import { useCharacterView } from "../hooks/useCharacterView";
import { Avatar } from "./Avatar";

export interface FriendListRowProps {
  friendCharacterId: string;
  onOpen: (friendCharacterId: string) => void;
}

/**
 * @param props - FriendListRowProps
 * @returns 可点击行
 */
export function FriendListRow(props: FriendListRowProps) {
  const ctx = useExtensionContext();
  const view = useCharacterView(ctx, props.friendCharacterId);

  return (
    <button
      type="button"
      className="chat-row"
      onClick={() => props.onOpen(props.friendCharacterId)}
    >
      <Avatar url={view.avatarUrl} glyph={view.glyph} />
      <div className="chat-row-main">
        <div className="chat-row-title">
          <span>{view.name}</span>
        </div>
      </div>
    </button>
  );
}
