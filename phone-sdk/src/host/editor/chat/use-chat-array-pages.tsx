/**
 * @file use-chat-array-pages.tsx
 * @description 聊天分区数组页（好友 / 属性 / 角色预设）的左中右编排。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import {
  ChatAppearancePreview,
  type ChatPreviewMode,
} from "./chat-appearance-preview";
import {
  createBlankChatAttribute,
  readEditableChatAttributes,
  writeEditableChatAttributes,
  type EditableChatAttribute,
} from "./chat-attributes-bridge";
import {
  ChatAttributesList,
  ChatAttributesPropertyPanel,
  ChatAvatarAssetPropertyPanel,
  ChatFriendsList,
  ChatFriendsPropertyPanel,
  ChatRolePresetPropertyPanel,
  ChatRolePresetsList,
  type ChatRoleSubMode,
} from "./chat-array-panels";
import {
  createBlankChatFriend,
  readEditableChatFriends,
  writeEditableChatFriends,
  type EditableChatFriend,
} from "./chat-friends-bridge";
import {
  createBlankChatAvatarAsset,
  createBlankChatRolePreset,
  readEditableChatAvatarAssets,
  readEditableChatRolePresets,
  writeEditableChatAvatarAssets,
  writeEditableChatRolePresets,
  type EditableChatAvatarAsset,
  type EditableChatRolePreset,
} from "./chat-role-presets-bridge";
import { StoryMessageAppearancePreview } from "../phone/story-message-appearance-preview";

/** 聊天 / 消息手机数组页 id（好友·属性属聊天 APP；角色预设属消息手机）。 */
export const CHAT_ARRAY_PAGE_IDS = new Set([
  "chat-friends",
  "chat-attributes",
  "story-role-presets",
]);

/**
 * 数组页四栏覆盖结果。
 */
export interface ChatArrayPagePanes {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  revision: number;
}

/**
 * 是否聊天数组特判页。
 *
 * @param pageId - 页面 id
 * @returns 是否特判
 */
export function isChatArrayPage(pageId: string | undefined): boolean {
  return Boolean(pageId && CHAT_ARRAY_PAGE_IDS.has(pageId));
}

/**
 * 聊天数组页编排。
 *
 * @param pageId - 当前页
 * @param copyValues - 文案等标量（预览用）
 * @param appearanceRevision - 外层 revision
 * @returns 左中右；非数组页返回 null
 */
export function useChatArrayPagePanes(
  pageId: string | undefined,
  copyValues: Record<string, string>,
  appearanceRevision: number,
): ChatArrayPagePanes | null {
  const ctx = useExtensionContext();
  const [revision, setRevision] = useState(0);
  const [selectedFriendUid, setSelectedFriendUid] = useState("");
  const [selectedAttrId, setSelectedAttrId] = useState("");
  const [roleMode, setRoleMode] = useState<ChatRoleSubMode>("presets");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState("");

  const friends = useMemo(() => {
    void revision;
    return readEditableChatFriends(ctx);
  }, [ctx, revision]);

  const attributes = useMemo(() => {
    void revision;
    return readEditableChatAttributes(ctx);
  }, [ctx, revision]);

  const presets = useMemo(() => {
    void revision;
    return readEditableChatRolePresets(ctx);
  }, [ctx, revision]);

  const avatars = useMemo(() => {
    void revision;
    return readEditableChatAvatarAssets(ctx);
  }, [ctx, revision]);

  useEffect(() => {
    if (friends.length === 0) {
      setSelectedFriendUid("");
      return;
    }
    if (!friends.some((f) => f.uid === selectedFriendUid)) {
      setSelectedFriendUid(friends[0]!.uid);
    }
  }, [friends, selectedFriendUid]);

  useEffect(() => {
    if (attributes.length === 0) return;
    if (!attributes.some((a) => a.id === selectedAttrId)) {
      setSelectedAttrId(attributes[0]!.id);
    }
  }, [attributes, selectedAttrId]);

  useEffect(() => {
    if (presets.length === 0) {
      setSelectedPresetId("");
      return;
    }
    if (!presets.some((p) => p.id === selectedPresetId)) {
      setSelectedPresetId(presets[0]!.id);
    }
  }, [presets, selectedPresetId]);

  useEffect(() => {
    if (avatars.length === 0) {
      setSelectedAvatarId("");
      return;
    }
    if (!avatars.some((a) => a.id === selectedAvatarId)) {
      setSelectedAvatarId(avatars[0]!.id);
    }
  }, [avatars, selectedAvatarId]);

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  const persistFriends = useCallback(
    (next: EditableChatFriend[]) => {
      writeEditableChatFriends(ctx, next);
      bump();
    },
    [bump, ctx],
  );

  const persistAttributes = useCallback(
    (next: EditableChatAttribute[]) => {
      writeEditableChatAttributes(ctx, next);
      bump();
    },
    [bump, ctx],
  );

  const persistPresets = useCallback(
    (next: EditableChatRolePreset[]) => {
      writeEditableChatRolePresets(ctx, next);
      bump();
    },
    [bump, ctx],
  );

  const persistAvatars = useCallback(
    (next: EditableChatAvatarAsset[]) => {
      writeEditableChatAvatarAssets(ctx, next);
      bump();
    },
    [bump, ctx],
  );

  const previewToken = appearanceRevision + revision;
  const selectedFriend =
    friends.find((f) => f.uid === selectedFriendUid) ?? null;
  const selectedAttr =
    attributes.find((a) => a.id === selectedAttrId) ?? null;
  const selectedPreset =
    presets.find((p) => p.id === selectedPresetId) ?? null;
  const selectedAvatar =
    avatars.find((a) => a.id === selectedAvatarId) ?? null;

  if (!isChatArrayPage(pageId)) {
    return null;
  }

  let previewMode: ChatPreviewMode = "home-chats";
  if (pageId === "chat-friends") previewMode = "home-friends";
  else if (pageId === "chat-attributes") previewMode = "attributes";

  const center =
    pageId === "story-role-presets" ? (
      <StoryMessageAppearancePreview
        mode="presets"
        values={copyValues}
        selectedPreset={selectedPreset}
        refreshToken={previewToken}
      />
    ) : (
      <ChatAppearancePreview
        values={copyValues}
        mode={previewMode}
        friends={friends}
        attributes={attributes}
        selectedPreset={selectedPreset}
        refreshToken={previewToken}
      />
    );

  if (pageId === "chat-friends") {
    return {
      revision,
      center,
      left: (
        <ChatFriendsList
          friends={friends}
          selectedUid={selectedFriendUid}
          onSelect={setSelectedFriendUid}
          onAdd={() => {
            const ids = new Set(friends.map((f) => f.characterId));
            const blank = createBlankChatFriend(ids);
            persistFriends([...friends, blank]);
            setSelectedFriendUid(blank.uid);
          }}
          onDelete={(uid) => {
            persistFriends(friends.filter((f) => f.uid !== uid));
          }}
        />
      ),
      right: (
        <ChatFriendsPropertyPanel
          friend={selectedFriend}
          onChange={(patch) => {
            if (!selectedFriend) return;
            const merged = { ...selectedFriend, ...patch };
            if (!merged.characterId.trim()) {
              merged.characterId = selectedFriend.characterId;
            }
            // 冲突则忽略 characterId 变更
            if (
              patch.characterId !== undefined &&
              patch.characterId !== selectedFriend.characterId &&
              friends.some(
                (f) =>
                  f.uid !== selectedFriend.uid &&
                  f.characterId === merged.characterId,
              )
            ) {
              merged.characterId = selectedFriend.characterId;
            }
            persistFriends(
              friends.map((f) => (f.uid === selectedFriend.uid ? merged : f)),
            );
          }}
        />
      ),
    };
  }

  if (pageId === "chat-attributes") {
    return {
      revision,
      center,
      left: (
        <ChatAttributesList
          fields={attributes}
          selectedId={selectedAttrId}
          onSelect={setSelectedAttrId}
          onAdd={() => {
            const ids = new Set(attributes.map((a) => a.id));
            const blank = createBlankChatAttribute(ids);
            persistAttributes([...attributes, blank]);
            setSelectedAttrId(blank.id);
          }}
          onDelete={(id) => {
            if (attributes.length <= 1) return;
            const next = attributes.filter((a) => a.id !== id);
            persistAttributes(next);
            setSelectedAttrId(next[0]?.id ?? "");
          }}
        />
      ),
      right: (
        <ChatAttributesPropertyPanel
          field={selectedAttr}
          onChange={(patch) => {
            if (!selectedAttr) return;
            const merged = { ...selectedAttr, ...patch };
            if (
              patch.id !== undefined &&
              patch.id !== selectedAttr.id &&
              attributes.some((a) => a.id === merged.id)
            ) {
              merged.id = selectedAttr.id;
            }
            if (!merged.label.trim()) merged.label = selectedAttr.label;
            if (!merged.id.trim()) merged.id = selectedAttr.id;
            const next = attributes.map((a) =>
              a.id === selectedAttrId ? merged : a,
            );
            persistAttributes(next);
            if (merged.id !== selectedAttrId) setSelectedAttrId(merged.id);
          }}
        />
      ),
    };
  }

  // story-role-presets（消息手机：角色预设 + 头像库）
  return {
    revision,
    center,
    left: (
      <ChatRolePresetsList
        mode={roleMode}
        onModeChange={setRoleMode}
        presets={presets}
        avatars={avatars}
        selectedPresetId={selectedPresetId}
        selectedAvatarId={selectedAvatarId}
        onSelectPreset={setSelectedPresetId}
        onSelectAvatar={setSelectedAvatarId}
        onAdd={() => {
          if (roleMode === "presets") {
            const ids = new Set(presets.map((p) => p.id));
            const blank = createBlankChatRolePreset(ids);
            persistPresets([...presets, blank]);
            setSelectedPresetId(blank.id);
          } else {
            const ids = new Set(avatars.map((a) => a.id));
            const blank = createBlankChatAvatarAsset(ids);
            persistAvatars([...avatars, blank]);
            setSelectedAvatarId(blank.id);
          }
        }}
        onDelete={() => {
          if (roleMode === "presets") {
            if (!selectedPresetId) return;
            persistPresets(presets.filter((p) => p.id !== selectedPresetId));
          } else {
            if (!selectedAvatarId) return;
            persistAvatars(avatars.filter((a) => a.id !== selectedAvatarId));
          }
        }}
      />
    ),
    right:
      roleMode === "presets" ? (
        <ChatRolePresetPropertyPanel
          preset={selectedPreset}
          onChange={(patch) => {
            if (!selectedPreset) return;
            const merged = { ...selectedPreset, ...patch };
            if (
              patch.id !== undefined &&
              patch.id !== selectedPreset.id &&
              presets.some((p) => p.id === merged.id)
            ) {
              merged.id = selectedPreset.id;
            }
            if (!merged.id.trim()) merged.id = selectedPreset.id;
            const next = presets.map((p) =>
              p.id === selectedPresetId ? merged : p,
            );
            persistPresets(next);
            if (merged.id !== selectedPresetId) setSelectedPresetId(merged.id);
          }}
        />
      ) : (
        <ChatAvatarAssetPropertyPanel
          asset={selectedAvatar}
          onChange={(patch) => {
            if (!selectedAvatar) return;
            const merged = { ...selectedAvatar, ...patch };
            if (
              patch.id !== undefined &&
              patch.id !== selectedAvatar.id &&
              avatars.some((a) => a.id === merged.id)
            ) {
              merged.id = selectedAvatar.id;
            }
            if (!merged.id.trim()) merged.id = selectedAvatar.id;
            const next = avatars.map((a) =>
              a.id === selectedAvatarId ? merged : a,
            );
            persistAvatars(next);
            if (merged.id !== selectedAvatarId) setSelectedAvatarId(merged.id);
          }}
        />
      ),
  };
}
