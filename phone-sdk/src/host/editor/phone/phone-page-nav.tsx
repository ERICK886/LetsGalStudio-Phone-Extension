/**
 * @file phone-page-nav.tsx
 * @description 编辑器左竖栏：按 section schema 的 pages 切换可编辑页面。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import React, { useMemo } from "react";

import type { PhoneEditorPageSchema } from "../../../client/runtime/types";
import { FaIcon } from "../shared/fa-icon";
import { useTheme } from "../theme/theme-provider";
import { sortEditorPages } from "../schema/phone-host-editor-schema";

/**
 * PhonePageNav 属性。
 */
export interface PhonePageNavProps {
  /** 当前分区下的页面 schema。 */
  pages: readonly PhoneEditorPageSchema[];
  /** 当前选中页面 id。 */
  pageId: string;
  /**
   * 切换页面。
   *
   * @param pageId - 新页面 id
   */
  onPageChange: (pageId: string) => void;
}

/**
 * 竖向页面导航。
 *
 * @param props - PhonePageNavProps
 * @returns 窄竖栏按钮列表
 */
export function PhonePageNav({
  pages,
  pageId,
  onPageChange,
}: PhonePageNavProps): React.ReactElement {
  const { tokens } = useTheme();
  const sorted = useMemo(() => sortEditorPages(pages), [pages]);

  return (
    <nav
      aria-label="编辑页面"
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 4,
        padding: 6,
        overflowY: "auto",
        background: tokens.bgElevated,
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
      }}
    >
      {sorted.map((page) => {
        const active = page.id === pageId;
        const soon = (page.status ?? "ready") === "comingSoon";

        return (
          <button
            key={page.id}
            type="button"
            title={soon ? `${page.label}（即将推出）` : page.label}
            aria-current={active ? "page" : undefined}
            data-testid={`phone-editor-page-${page.id}`}
            onClick={() => onPageChange(page.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              width: "100%",
              minHeight: 52,
              padding: "8px 4px",
              borderRadius: 4,
              border: `1px solid ${active ? tokens.accent : "transparent"}`,
              background: active ? `${tokens.accent}22` : "transparent",
              color: active ? tokens.textPrimary : tokens.textSecondary,
              cursor: "pointer",
              opacity: soon && !active ? 0.72 : 1,
            }}
          >
            {page.icon ? (
              <FaIcon name={page.icon} css={{ fontSize: 14 }} />
            ) : null}
            <span
              style={{
                fontSize: 10,
                lineHeight: 1.25,
                textAlign: "center",
                wordBreak: "break-all",
                fontWeight: active ? 600 : 400,
              }}
            >
              {page.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default PhonePageNav;
