/**
 * @file use-schema-editor-panes.tsx
 * @description 通用：按 PhoneEditorSectionSchema 编排四栏（桌面应用 / 聊天数组页等）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.4.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import type {
  PhoneEditorCustomPanes,
  PhoneEditorSectionSchema,
} from "../../../client/runtime/types";
import {
  ChatAppearancePreview,
  type ChatPreviewMode,
} from "../chat/chat-appearance-preview";
import { readEditableChatFriends } from "../chat/chat-friends-bridge";
import { useChatArrayPagePanes } from "../chat/use-chat-array-pages";
import { PhoneAppearancePreview } from "../phone/phone-appearance-preview";
import { StoryMessageAppearancePreview } from "../phone/story-message-appearance-preview";
import { PhoneContentList } from "../phone/phone-content-list";
import { PhonePageNav } from "../phone/phone-page-nav";
import { PhonePropertyPanel } from "../phone/phone-property-panel";
import { useDesktopCatalogEditor } from "../phone/use-desktop-catalog-editor";
import { PlaceholderPane } from "../shell/placeholder-pane";
import {
  defaultEditorPageId,
  getSectionContentItem,
  resolveEditorPage,
  resolvePageContentItems,
} from "./phone-host-editor-schema";
import {
  readSectionFieldValues,
  writeSectionContentItem,
} from "./section-settings-bridge";

/**
 * 四栏节点。
 */
export interface SchemaEditorPaneNodes {
  nav: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}

/**
 * 按分区 schema 驱动编辑器四栏。
 *
 * @param schema - 完整分区 schema（pages + contentItems + settingsModuleId）
 * @returns 四栏 React 节点
 */
export function useSchemaEditorPanes(
  schema: PhoneEditorSectionSchema,
): SchemaEditorPaneNodes {
  const ctx = useExtensionContext();
  const pages = schema.pages;

  const [pageId, setPageId] = useState(() => defaultEditorPageId(pages));
  const [selectedId, setSelectedId] = useState(
    () => resolvePageContentItems(schema, pages[0]?.contentItemIds)[0]?.id ?? "",
  );
  const [revision, setRevision] = useState(0);

  // 切换顶栏分区时重置页面
  useEffect(() => {
    setPageId(defaultEditorPageId(pages));
  }, [schema.sectionId]);

  useEffect(() => {
    if (!pages.some((p) => p.id === pageId)) {
      setPageId(defaultEditorPageId(pages));
    }
  }, [pages, pageId]);

  const page = useMemo(
    () => resolveEditorPage(pages, pageId),
    [pages, pageId],
  );

  const pageItems = useMemo(
    () => resolvePageContentItems(schema, page?.contentItemIds),
    [schema, page],
  );

  useEffect(() => {
    if (pageItems.length === 0) return;
    if (!pageItems.some((item) => item.id === selectedId)) {
      setSelectedId(pageItems[0]!.id);
    }
  }, [pageItems, selectedId]);

  const values = useMemo(() => {
    void revision;
    return readSectionFieldValues(ctx, schema);
  }, [ctx, schema, revision]);

  const bumpRevision = useCallback(() => setRevision((n) => n + 1), []);

  const handleChange = useCallback(
    (id: string, value: string) => {
      const item = getSectionContentItem(schema, id);
      if (!item) return;
      writeSectionContentItem(ctx, schema, item, value);
      bumpRevision();
    },
    [ctx, schema, bumpRevision],
  );

  const isDesktopAppsPage = page?.id === "desktop-apps";
  const status = page?.status ?? "ready";
  const isReady = status === "ready";
  const previewKind = page?.preview ?? "placeholder";
  const comingTitle = page?.label ?? "页面";
  const moduleId = schema.settingsModuleId;

  // Hook 必须无条件调用
  const desktopCatalog = useDesktopCatalogEditor(values, revision);
  const chatArray = useChatArrayPagePanes(page?.id, values, revision);

  const chatFriendsForPreview = useMemo(() => {
    void revision;
    if (previewKind !== "chat") return [];
    return readEditableChatFriends(ctx);
  }, [ctx, previewKind, revision]);

  let customPanes: PhoneEditorCustomPanes | null = null;
  if (schema.resolveCustomPanes) {
    try {
      customPanes = schema.resolveCustomPanes({
        pageId: page?.id ?? "",
        values,
        revision,
        bump: bumpRevision,
      });
    } catch (err) {
      console.warn(
        "[phone-editor] resolveCustomPanes failed",
        schema.sectionId,
        err,
      );
      customPanes = null;
    }
  }

  let left: React.ReactNode;
  let center: React.ReactNode;
  let right: React.ReactNode;

  if (!isReady) {
    left = (
      <PlaceholderPane
        title={`${comingTitle} · 内容项`}
        description="即将推出：此页面的可自定义内容项。"
      />
    );
    center = (
      <PlaceholderPane
        title={`${comingTitle} · 预览`}
        description="即将推出：此页面的预览内容。"
      />
    );
    right = (
      <PlaceholderPane
        title={`${comingTitle} · 属性`}
        description="即将推出：此页面的属性编辑。"
      />
    );
  } else if (isDesktopAppsPage) {
    left = desktopCatalog.left;
    center = desktopCatalog.center;
    right = desktopCatalog.right;
  } else if (chatArray) {
    left = chatArray.left;
    center = chatArray.center;
    right = chatArray.right;
  } else if (customPanes) {
    left = customPanes.left;
    center = customPanes.center;
    right = customPanes.right;
  } else {
    left = (
      <PhoneContentList
        selectedId={selectedId}
        onSelect={setSelectedId}
        items={pageItems}
      />
    );

    if (previewKind === "desktop") {
      center = (
        <PhoneAppearancePreview values={values} refreshToken={revision} />
      );
    } else if (previewKind === "chat" && page?.id === "story-message-behavior") {
      center = (
        <StoryMessageAppearancePreview
          mode="behavior"
          values={values}
          refreshToken={revision}
        />
      );
    } else if (previewKind === "chat") {
      const chatMode: ChatPreviewMode = "home-chats";
      center = (
        <ChatAppearancePreview
          values={values}
          mode={chatMode}
          friends={chatFriendsForPreview}
          refreshToken={revision}
        />
      );
    } else {
      center = (
        <PlaceholderPane
          title={`${comingTitle} · 预览`}
          description="该页面尚未配置预览。"
        />
      );
    }

    right = (
      <PhonePropertyPanel
        selectedId={selectedId}
        values={values}
        items={schema.contentItems}
        settingsModuleId={moduleId}
        onChange={handleChange}
      />
    );
  }

  return {
    nav: (
      <PhonePageNav pages={pages} pageId={pageId} onPageChange={setPageId} />
    ),
    left,
    center,
    right,
  };
}
