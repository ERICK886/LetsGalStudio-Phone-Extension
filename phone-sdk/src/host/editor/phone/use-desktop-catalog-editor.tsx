/**
 * @file use-desktop-catalog-editor.tsx
 * @description 「桌面应用」页：应用 / 动作子切换 + 列表与属性编排。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @example
 * ```tsx
 * const panes = useDesktopCatalogEditor(appearanceValues, appearanceRevision);
 * // panes.left / panes.center / panes.right
 * ```
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import {
  actionSelectOptions,
  createBlankCatalogAction,
  readEditableCatalogActions,
  writeEditableCatalogActions,
  type EditableActionKind,
  type EditableCatalogAction,
} from "./desktop-actions-bridge";
import { DesktopActionsList } from "./desktop-actions-list";
import { DesktopActionsPropertyPanel } from "./desktop-actions-property-panel";
import {
  createBlankCatalogApp,
  readEditableCatalogApps,
  writeEditableCatalogApps,
  type EditableCatalogApp,
} from "./desktop-apps-bridge";
import { DesktopAppsList } from "./desktop-apps-list";
import { DesktopAppsPropertyPanel } from "./desktop-apps-property-panel";
import { PhoneAppearancePreview } from "./phone-appearance-preview";
import { useTheme, FONT_SIZE_DEFAULT } from "../theme/theme-provider";

/** 桌面应用页子模式 */
export type DesktopCatalogMode = "apps" | "actions";

/**
 * 桌面目录编辑器四栏中的三栏（左中右）。
 */
export interface DesktopCatalogEditorPanes {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  /** catalogApps / 五组动作写入后递增，可并入外层 previewToken */
  catalogRevision: number;
}

/**
 * 「桌面应用」页编排：顶栏应用/动作切换，中栏真机预览。
 *
 * @param appearanceValues - 外观字段（预览用）
 * @param appearanceRevision - 外层外观 revision
 * @returns 左中右节点与 catalogRevision
 */
export function useDesktopCatalogEditor(
  appearanceValues: Record<string, string>,
  appearanceRevision: number,
): DesktopCatalogEditorPanes {
  const ctx = useExtensionContext();
  const { tokens } = useTheme();

  const [mode, setMode] = useState<DesktopCatalogMode>("apps");
  const [selectedAppId, setSelectedAppId] = useState("");
  const [selectedActionId, setSelectedActionId] = useState("");
  const [addKind, setAddKind] = useState<EditableActionKind>("system-slot");
  const [catalogRevision, setCatalogRevision] = useState(0);

  const catalogApps = useMemo(() => {
    void catalogRevision;
    return readEditableCatalogApps(ctx);
  }, [ctx, catalogRevision]);

  const catalogActions = useMemo(() => {
    void catalogRevision;
    return readEditableCatalogActions(ctx);
  }, [ctx, catalogRevision]);

  const actionOptions = useMemo(
    () => actionSelectOptions(catalogActions),
    [catalogActions],
  );

  useEffect(() => {
    if (catalogApps.length === 0) return;
    if (!catalogApps.some((app) => app.id === selectedAppId)) {
      setSelectedAppId(catalogApps[0]!.id);
    }
  }, [catalogApps, selectedAppId]);

  useEffect(() => {
    if (catalogActions.length === 0) return;
    if (!catalogActions.some((action) => action.id === selectedActionId)) {
      setSelectedActionId(catalogActions[0]!.id);
    }
  }, [catalogActions, selectedActionId]);

  const persistApps = useCallback(
    (next: EditableCatalogApp[]) => {
      writeEditableCatalogApps(ctx, next);
      setCatalogRevision((n) => n + 1);
    },
    [ctx],
  );

  const persistActions = useCallback(
    (next: EditableCatalogAction[]) => {
      writeEditableCatalogActions(ctx, next);
      setCatalogRevision((n) => n + 1);
    },
    [ctx],
  );

  const handleAddApp = useCallback(() => {
    const ids = new Set(catalogApps.map((app) => app.id));
    const fallbackActionId =
      catalogActions[0]?.id ??
      actionOptions[0]?.id ??
      "settings";
    const blank = createBlankCatalogApp(ids, fallbackActionId);
    persistApps([...catalogApps, blank]);
    setSelectedAppId(blank.id);
  }, [actionOptions, catalogActions, catalogApps, persistApps]);

  const handleDeleteApp = useCallback(
    (id: string) => {
      if (catalogApps.length <= 1) return;
      const next = catalogApps.filter((app) => app.id !== id);
      persistApps(next);
      setSelectedAppId(next[0]?.id ?? "");
    },
    [catalogApps, persistApps],
  );

  const handlePatchApp = useCallback(
    (patch: Partial<EditableCatalogApp>) => {
      const current = catalogApps.find((app) => app.id === selectedAppId);
      if (!current) return;

      const merged: EditableCatalogApp = { ...current, ...patch };

      if (
        patch.id !== undefined &&
        patch.id !== current.id &&
        catalogApps.some((app) => app.id === merged.id)
      ) {
        merged.id = current.id;
      }

      if (!merged.name.trim()) merged.name = current.name;
      if (!merged.id.trim()) merged.id = current.id;

      const next = catalogApps.map((app) =>
        app.id === selectedAppId ? merged : app,
      );
      persistApps(next);
      if (merged.id !== selectedAppId) {
        setSelectedAppId(merged.id);
      }
    },
    [catalogApps, persistApps, selectedAppId],
  );

  const handleAddAction = useCallback(() => {
    const ids = new Set(catalogActions.map((action) => action.id));
    const blank = createBlankCatalogAction(addKind, ids);
    persistActions([...catalogActions, blank]);
    setSelectedActionId(blank.id);
  }, [addKind, catalogActions, persistActions]);

  const handleDeleteAction = useCallback(
    (id: string) => {
      if (catalogActions.length <= 1) return;
      const nextActions = catalogActions.filter((action) => action.id !== id);
      const fallbackId = nextActions[0]?.id ?? "settings";

      // 应用若引用已删动作，回退到剩余第一个动作
      const nextApps = catalogApps.map((app) =>
        app.defaultActionId === id
          ? { ...app, defaultActionId: fallbackId }
          : app,
      );

      writeEditableCatalogActions(ctx, nextActions);
      writeEditableCatalogApps(ctx, nextApps);
      setCatalogRevision((n) => n + 1);
      setSelectedActionId(fallbackId);
    },
    [catalogActions, catalogApps, ctx],
  );

  const handlePatchAction = useCallback(
    (patch: Partial<EditableCatalogAction>) => {
      const current = catalogActions.find(
        (action) => action.id === selectedActionId,
      );
      if (!current) return;

      const merged: EditableCatalogAction = { ...current, ...patch };

      // 不允许在属性面板改 kind
      merged.kind = current.kind;

      if (
        patch.id !== undefined &&
        patch.id !== current.id &&
        catalogActions.some((action) => action.id === merged.id)
      ) {
        merged.id = current.id;
      }

      if (!merged.name.trim()) merged.name = current.name;
      if (!merged.id.trim()) merged.id = current.id;

      const nextActions = catalogActions.map((action) =>
        action.id === selectedActionId ? merged : action,
      );

      // 动作 id 变更时同步应用 defaultActionId
      if (merged.id !== current.id) {
        const nextApps = catalogApps.map((app) =>
          app.defaultActionId === current.id
            ? { ...app, defaultActionId: merged.id }
            : app,
        );
        writeEditableCatalogApps(ctx, nextApps);
      }

      persistActions(nextActions);
      if (merged.id !== selectedActionId) {
        setSelectedActionId(merged.id);
      }
    },
    [
      catalogActions,
      catalogApps,
      ctx,
      persistActions,
      selectedActionId,
    ],
  );

  const selectedApp =
    catalogApps.find((app) => app.id === selectedAppId) ?? null;
  const selectedAction =
    catalogActions.find((action) => action.id === selectedActionId) ?? null;

  const previewToken = appearanceRevision + catalogRevision;

  const modeTabs = (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "0 4px 4px",
        flex: "0 0 auto",
      }}
    >
      {(
        [
          { id: "apps", label: "应用" },
          { id: "actions", label: "动作" },
        ] as const
      ).map((tab) => {
        const active = mode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
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
  );

  const left =
    mode === "apps" ? (
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
        {modeTabs}
        <div style={{ flex: 1, minHeight: 0 }}>
          <DesktopAppsList
            apps={catalogApps}
            selectedId={selectedAppId}
            onSelect={setSelectedAppId}
            onAdd={handleAddApp}
            onDelete={handleDeleteApp}
          />
        </div>
      </div>
    ) : (
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
        {modeTabs}
        <div style={{ flex: 1, minHeight: 0 }}>
          <DesktopActionsList
            actions={catalogActions}
            selectedId={selectedActionId}
            addKind={addKind}
            onAddKindChange={setAddKind}
            onSelect={setSelectedActionId}
            onAdd={handleAddAction}
            onDelete={handleDeleteAction}
          />
        </div>
      </div>
    );

  const center = (
    <PhoneAppearancePreview
      values={appearanceValues}
      refreshToken={previewToken}
    />
  );

  const right =
    mode === "apps" ? (
      <DesktopAppsPropertyPanel
        app={selectedApp}
        actionOptions={actionOptions}
        onChange={handlePatchApp}
      />
    ) : (
      <DesktopActionsPropertyPanel
        action={selectedAction}
        onChange={handlePatchAction}
      />
    );

  return { left, center, right, catalogRevision };
}
