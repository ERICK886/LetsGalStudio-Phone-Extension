/**
 * @file phone-editor-app.tsx
 * @description 手机编辑器根组件：读取本模块 settings，包裹 ThemeProvider 并渲染外壳。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 归属 `@ink-zenly/phone-sdk` 宿主侧（`host/editor`），与 PhoneExtension / Toast 并列。
 * - `ThemeProvider` 用 `key={mode}`，确保项目设置改主题后整树按新 mode 重建。
 */

import React, { useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import {
  EDITOR_SECTIONS,
  type EditorSection,
} from "../constants";
import { ThemeProvider } from "../theme/theme-provider";
import { PhoneEditorShell } from "../shell/phone-editor-shell";

/**
 * 手机编辑器 App：settings 驱动主题与栏宽，本地 state 驱动分区 Tab。
 *
 * @returns 主题包裹后的编辑器外壳
 *
 * @example
 * ```tsx
 * // Extension.render()
 * return { component: PhoneEditorApp, props: {} };
 * ```
 */
export function PhoneEditorApp(): React.ReactElement {
  const ctx = useExtensionContext();

  const [themeSetting] = ctx.settings.useValue<"light" | "dark">("theme");
  const [leftWidthSetting] = ctx.settings.useValue<number>("editorLeftWidth");
  const [rightWidthSetting] = ctx.settings.useValue<number>("editorRightWidth");

  const [section, setSection] = useState<EditorSection>(
    EDITOR_SECTIONS[0]?.id ?? "shell",
  );

  const mode = themeSetting === "light" ? "light" : "dark";
  const leftWidth =
    typeof leftWidthSetting === "number" && Number.isFinite(leftWidthSetting)
      ? leftWidthSetting
      : 260;
  const rightWidth =
    typeof rightWidthSetting === "number" && Number.isFinite(rightWidthSetting)
      ? rightWidthSetting
      : 300;

  return (
    <ThemeProvider key={mode} initialMode={mode}>
      <PhoneEditorShell
        section={section}
        onSectionChange={setSection}
        leftWidth={leftWidth}
        rightWidth={rightWidth}
        onToggleTheme={() => {
          ctx.settings.set("theme", mode === "dark" ? "light" : "dark");
        }}
      />
    </ThemeProvider>
  );
}

export default PhoneEditorApp;
