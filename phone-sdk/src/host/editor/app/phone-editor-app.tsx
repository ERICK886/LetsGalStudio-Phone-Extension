/**
 * @file phone-editor-app.tsx
 * @description 手机编辑器根组件：订阅已注册 APP，动态生成顶栏分区并渲染外壳。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.4.1
 */

import React, { useEffect, useMemo, useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import { subscribePhoneAppRegistry } from "../../../client/runtime/register";
import {
  buildPhoneEditorSections,
  defaultPhoneEditorSectionId,
} from "../editor-sections";
import { resolveEditorSectionSchema } from "../schema/resolve-editor-section-schema";
import { useSchemaEditorPanes } from "../schema/use-schema-editor-panes";
import { ThemeProvider } from "../theme/theme-provider";
import { PhoneEditorShell } from "../shell/phone-editor-shell";

/**
 * 主题内实际渲染的外壳（按当前分区 schema 驱动四栏）。
 */
function PhoneEditorShellHost({
  sections,
  sectionId,
  onSectionChange,
  leftWidth,
  rightWidth,
  onToggleTheme,
}: {
  sections: ReturnType<typeof buildPhoneEditorSections>;
  sectionId: string;
  onSectionChange: (id: string) => void;
  leftWidth: number;
  rightWidth: number;
  onToggleTheme: () => void;
}): React.ReactElement {
  const schema = useMemo(
    () => resolveEditorSectionSchema(sectionId),
    [sectionId, sections],
  );
  const panes = useSchemaEditorPanes(schema);

  return (
    <PhoneEditorShell
      sections={sections}
      sectionId={sectionId}
      onSectionChange={onSectionChange}
      leftWidth={leftWidth}
      rightWidth={rightWidth}
      navPane={panes.nav}
      leftPane={panes.left}
      centerPane={panes.center}
      rightPane={panes.right}
      onToggleTheme={onToggleTheme}
    />
  );
}

/**
 * 手机编辑器 App。
 *
 * @returns 主题包裹后的编辑器外壳
 */
export function PhoneEditorApp(): React.ReactElement {
  const ctx = useExtensionContext();

  const [themeSetting] = ctx.settings.useValue<"light" | "dark">("theme");
  const [leftWidthSetting] = ctx.settings.useValue<number>("editorLeftWidth");
  const [rightWidthSetting] = ctx.settings.useValue<number>("editorRightWidth");

  /** 注册表版本戳：subscribe 时递增，触发 sections 重算。 */
  const [registryTick, setRegistryTick] = useState(0);

  useEffect(() => {
    return subscribePhoneAppRegistry(() => {
      setRegistryTick((n) => n + 1);
    });
  }, []);

  const sections = useMemo(
    () => buildPhoneEditorSections(),
    // registryTick 变化时重读 listRegisteredPhoneApps
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional tick
    [registryTick],
  );

  const [sectionId, setSectionId] = useState(() =>
    defaultPhoneEditorSectionId(buildPhoneEditorSections()),
  );

  useEffect(() => {
    if (!sections.some((s) => s.id === sectionId)) {
      setSectionId(defaultPhoneEditorSectionId(sections));
    }
  }, [sections, sectionId]);

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
      <PhoneEditorShellHost
        sections={sections}
        sectionId={sectionId}
        onSectionChange={setSectionId}
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
