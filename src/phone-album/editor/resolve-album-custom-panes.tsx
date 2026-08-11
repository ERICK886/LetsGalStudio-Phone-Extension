/**
 * @file resolve-album-custom-panes.tsx
 * @description 相册编辑器自定义三栏：文案、外观、默认相册与默认媒体统一使用首页预览。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 *
 * @remarks
 * 返回 `null` 时宿主走默认 contentItems + 预览 + 属性面板。
 */

import React, { useCallback, useEffect, useMemo } from "react";
import { useExtensionContext } from "@avg-studio/sdk";
import {
  PhoneContentList,
  PhonePropertyPanel,
  writeModuleSetting,
  type PhoneEditorContentItemSchema,
  type PhoneEditorCustomPanes,
  type ResolvePhoneEditorCustomPanes,
} from "@ink-zenly/phone-sdk";

import {
  AlbumCatalogList,
  AlbumCatalogPropertyPanel,
  AlbumMediaList,
  AlbumMediaPropertyPanel,
} from "./album-array-panels";
import {
  ALBUM_APPEARANCE_CONTENT_ITEMS,
  ALBUM_COPY_CONTENT_ITEMS,
  ALBUM_SETTINGS_MODULE_ID,
} from "./album-app-editor-schema";
import {
  createBlankDefaultAlbum,
  readEditableDefaultAlbums,
  writeEditableDefaultAlbums,
  type EditableDefaultAlbum,
} from "./albums-bridge";
import { AlbumHomePreview } from "./album-home-preview";
import {
  createBlankDefaultMedia,
  readEditableDefaultMedia,
  stripAlbumIdFromMedia,
  writeEditableDefaultMedia,
  type EditableDefaultMedia,
} from "./media-bridge";
import { useAlbumEditorSelection } from "./album-selection-store";
import {
  mergePendingDefaultMedia,
  removePendingDefaultMedia,
  upsertPendingDefaultMedia,
} from "./album-editor-drafts";

type PaneProps = Parameters<ResolvePhoneEditorCustomPanes>[0];

/**
 * 将数组行 patch 合并回指定 uid。
 *
 * ID 是 settings 的业务主键；改成已存在 ID 会导致序列化静默去重而丢行。
 * 因此冲突时明确保留旧 ID，其余字段仍可正常更新。
 *
 * @param rows - 当前行集合
 * @param uid - 被编辑的稳定行键
 * @param patch - 属性面板提交的局部改动
 * @returns 合并后的行集合
 */
function mergeRowPatch<T extends { uid: string; id: string }>(
  rows: readonly T[],
  uid: string,
  patch: Partial<T>,
): T[] {
  const target = rows.find((row) => row.uid === uid);
  if (!target) return [...rows];

  const nextId = typeof patch.id === "string" ? patch.id.trim() : undefined;
  const idConflicts =
    nextId !== undefined &&
    nextId !== target.id &&
    rows.some((row) => row.uid !== uid && row.id === nextId);

  return rows.map((row) =>
    row.uid === uid
      ? {
          ...row,
          ...patch,
          // ID 冲突时忽略该字段，避免同一 settings 主键覆盖另一行。
          id: idConflicts ? target.id : (patch.id ?? target.id),
          // uid 是跨 pane 的业务选择键，成功改 ID 时须同步更新。
          uid: idConflicts ? target.uid : (nextId ?? target.uid),
        }
      : row,
  );
}

interface AlbumCopyEditorProps extends Pick<PaneProps, "values" | "bump"> {
  /** 当前页可用的 contentItems（文案页或外观页）。 */
  items: readonly PhoneEditorContentItemSchema[];
}

/** 文案 / 外观页右栏；选中态由专用 store 连接分置的左右栏。 */
function AlbumCopyEditor({
  values,
  bump,
  items,
}: AlbumCopyEditorProps): React.ReactElement {
  const ctx = useExtensionContext();
  const { selectedCopyId } = useAlbumEditorSelection();

  const handleChange = useCallback(
    (id: string, value: string) => {
      writeModuleSetting(ctx, ALBUM_SETTINGS_MODULE_ID, id, value);
      bump();
    },
    [bump, ctx],
  );

  return (
    <PhonePropertyPanel
      selectedId={selectedCopyId}
      values={values}
      items={items}
      settingsModuleId={ALBUM_SETTINGS_MODULE_ID}
      onChange={handleChange}
    />
  );
}

/**
 * 左栏：数组页使用跨左右栏共享的 selection store，文案页使用标准内容项列表。
 */
function AlbumEditorLeft({
  pageId,
  revision,
  bump,
}: Pick<PaneProps, "pageId" | "revision" | "bump">): React.ReactElement {
  const ctx = useExtensionContext();
  const {
    selectedAlbumUid,
    selectedMediaUid,
    setSelectedAlbumUid,
    setSelectedMediaUid,
  } = useAlbumEditorSelection();
  const albums = useMemo(() => {
    void revision;
    return readEditableDefaultAlbums(ctx);
  }, [ctx, revision]);
  const media = useMemo(() => {
    void revision;
    return mergePendingDefaultMedia(readEditableDefaultMedia(ctx));
  }, [ctx, revision]);

  const addAlbum = useCallback(() => {
    const next = createBlankDefaultAlbum(new Set(albums.map((row) => row.id)));
    writeEditableDefaultAlbums(ctx, [...albums, next]);
    setSelectedAlbumUid(next.uid);
    bump();
  }, [albums, bump, ctx, setSelectedAlbumUid]);

  const deleteAlbum = useCallback(
    (uid: string) => {
      const deleted = albums.find((row) => row.uid === uid);
      if (!deleted) return;
      const nextAlbums = albums.filter((row) => row.uid !== uid);
      // 先清理媒体的关联，再删相册，确保任意刷新点都不会留下悬空 albumId。
      const mediaOk = writeEditableDefaultMedia(
        ctx,
        stripAlbumIdFromMedia(media, deleted.id),
      );
      if (!mediaOk) {
        console.warn("[phone-album] 删除相册失败：无法清理媒体关联", deleted.id);
        return;
      }
      const albumsOk = writeEditableDefaultAlbums(ctx, nextAlbums);
      if (!albumsOk) {
        console.warn("[phone-album] 删除相册失败：无法写入相册列表", deleted.id);
        return;
      }
      setSelectedAlbumUid("");
      bump();
    },
    [albums, bump, ctx, media, setSelectedAlbumUid],
  );

  const addMedia = useCallback(() => {
    const next = createBlankDefaultMedia(new Set(media.map((row) => row.id)));
    upsertPendingDefaultMedia(next);
    setSelectedMediaUid(next.uid);
    bump();
  }, [bump, media, setSelectedMediaUid]);

  const deleteMedia = useCallback(
    (uid: string) => {
      const mediaOk = writeEditableDefaultMedia(
        ctx,
        media.filter((row) => row.uid !== uid),
      );
      if (!mediaOk) {
        console.warn("[phone-album] 删除媒体失败：无法写入媒体列表", uid);
        return;
      }
      removePendingDefaultMedia(uid);
      setSelectedMediaUid("");
      bump();
    },
    [bump, ctx, media, setSelectedMediaUid],
  );

  if (pageId === "album-catalog") {
    return (
      <AlbumCatalogList
        albums={albums}
        selectedUid={selectedAlbumUid}
        onSelect={setSelectedAlbumUid}
        onAdd={addAlbum}
        onDelete={deleteAlbum}
      />
    );
  }

  return (
    <AlbumMediaList
      media={media}
      selectedUid={selectedMediaUid}
      onSelect={setSelectedMediaUid}
      onAdd={addMedia}
      onDelete={deleteMedia}
    />
  );
}

/**
 * 右栏：读取与左栏相同的 settings 快照，并将字段 patch 持久化。
 */
function AlbumEditorRight({
  pageId,
  values,
  revision,
  bump,
}: PaneProps): React.ReactElement {
  const ctx = useExtensionContext();
  const {
    selectedAlbumUid,
    selectedMediaUid,
    setSelectedAlbumUid,
    setSelectedMediaUid,
  } = useAlbumEditorSelection();
  const albums = useMemo(() => {
    void revision;
    return readEditableDefaultAlbums(ctx);
  }, [ctx, revision]);
  const media = useMemo(() => {
    void revision;
    return mergePendingDefaultMedia(readEditableDefaultMedia(ctx));
  }, [ctx, revision]);
  const selectedAlbum = albums.find((row) => row.uid === selectedAlbumUid) ?? null;
  const selectedMedia = media.find((row) => row.uid === selectedMediaUid) ?? null;

  const changeAlbum = useCallback(
    (patch: Partial<EditableDefaultAlbum>) => {
      if (!selectedAlbum) return;
      const nextRows = mergeRowPatch(albums, selectedAlbum.uid, patch);
      const nextSelected = nextRows.find(
        (row) => row.id === (patch.id?.trim() || selectedAlbum.id),
      ) ?? nextRows.find((row) => row.uid === selectedAlbum.uid);
      if (!writeEditableDefaultAlbums(ctx, nextRows)) {
        console.warn("[phone-album] 更新相册失败：无法写入相册列表", selectedAlbum.id);
        return;
      }
      if (nextSelected) setSelectedAlbumUid(nextSelected.uid);
      bump();
    },
    [albums, bump, ctx, selectedAlbum, setSelectedAlbumUid],
  );

  const changeMedia = useCallback(
    (patch: Partial<EditableDefaultMedia>) => {
      if (!selectedMedia) return;
      const nextRows = mergeRowPatch(media, selectedMedia.uid, patch);
      const nextSelected =
        nextRows.find((row) => row.uid !== selectedMedia.uid && row.id === patch.id?.trim())
        ?? nextRows.find((row) => row.uid === selectedMedia.uid)
        ?? null;
      if (!nextSelected) return;
      // 空素材行留在会话草稿中；其余行成功写入后移除草稿。
      removePendingDefaultMedia(selectedMedia.uid);
      upsertPendingDefaultMedia(nextSelected);
      if (!writeEditableDefaultMedia(ctx, nextRows)) {
        console.warn("[phone-album] 更新媒体失败：无法写入媒体列表", selectedMedia.id);
        return;
      }
      if (nextSelected.asset.trim()) {
        removePendingDefaultMedia(nextSelected.uid);
      }
      setSelectedMediaUid(nextSelected.uid);
      bump();
    },
    [bump, ctx, media, selectedMedia, setSelectedMediaUid],
  );

  if (pageId === "album-copy") {
    return <AlbumCopyEditor values={values} bump={bump} items={ALBUM_COPY_CONTENT_ITEMS} />;
  }
  if (pageId === "album-appearance") {
    return <AlbumCopyEditor values={values} bump={bump} items={ALBUM_APPEARANCE_CONTENT_ITEMS} />;
  }
  if (pageId === "album-catalog") {
    return <AlbumCatalogPropertyPanel album={selectedAlbum} onChange={changeAlbum} />;
  }
  return (
    <AlbumMediaPropertyPanel
      media={selectedMedia}
      albums={albums}
      onChange={changeMedia}
    />
  );
}

/**
 * 相册分区自定义编辑器三栏：文案、外观、默认相册、默认媒体。
 *
 * @returns `null` 表示回落默认编辑器路径
 */
export function resolveAlbumCustomPanes(
  args: PaneProps,
): PhoneEditorCustomPanes | null {
  if (
    args.pageId !== "album-copy" &&
    args.pageId !== "album-appearance" &&
    args.pageId !== "album-catalog" &&
    args.pageId !== "album-media"
  ) {
    return null;
  }

  return {
    left:
      args.pageId === "album-copy" ? (
        <AlbumCopyList items={ALBUM_COPY_CONTENT_ITEMS} />
      ) : args.pageId === "album-appearance" ? (
        <AlbumCopyList items={ALBUM_APPEARANCE_CONTENT_ITEMS} />
      ) : (
        <AlbumEditorLeft
          pageId={args.pageId}
          revision={args.revision}
          bump={args.bump}
        />
      ),
    center: (
      <AlbumHomePreview
        values={args.values}
        revision={args.revision}
        pageId={args.pageId}
      />
    ),
    right: (
      <AlbumEditorRight
        pageId={args.pageId}
        values={args.values}
        revision={args.revision}
        bump={args.bump}
      />
    ),
  };
}

/** 文案 / 外观页左栏；订阅选中态，并在切换页面时自动选中当前页第一个内容项。 */
function AlbumCopyList({
  items,
}: {
  items: readonly PhoneEditorContentItemSchema[];
}): React.ReactElement {
  const { selectedCopyId, setSelectedCopyId } = useAlbumEditorSelection();
  const selectedId = useMemo(() => {
    if (items.some((item) => item.id === selectedCopyId)) {
      return selectedCopyId;
    }
    return items[0]?.id ?? "";
  }, [items, selectedCopyId]);

  useEffect(() => {
    if (selectedId && selectedId !== selectedCopyId) {
      setSelectedCopyId(selectedId);
    }
  }, [selectedId, selectedCopyId, setSelectedCopyId]);

  return (
    <PhoneContentList
      selectedId={selectedId}
      onSelect={setSelectedCopyId}
      items={items}
    />
  );
}
