# 手机编辑器外壳（phone-editor shell）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在宿主包新增独立模块 `phone-editor`，交付带 `#DB2777` 主题的编辑器外壳（顶栏品牌 + 四 Tab + 左中右占位三栏），并在 `src/index.tsx` 导出。

**Architecture:** 对齐旁路仓 `ext-27b96b` 的 EditorShell chrome，但只写轻量自研实现：`PhoneEditorExtension` → `PhoneEditorApp`（ThemeProvider）→ `PhoneEditorShell`。不拷贝场景交互业务，不接手机内页 bootstrap。

**Tech Stack:** TypeScript、React 18、`@avg-studio/sdk`（`Extension` / `extension` / `settings`）、Vite 构建、可选 `node --import tsx --test` 测 token 纯函数。

**Spec:** `docs/superpowers/specs/2026-08-10-phone-editor-shell-design.md`

## Global Constraints

- 扩展包 id：`ink.zenly.ext-7a9373`
- 程序 id / `@extension({ id })`：`phone-editor`
- 模块标签：`手机编辑器`
- 主题强调色：`#DB2777`（浅色可用 `#BE185D`）
- 默认主题：`dark`
- 左栏默认宽 `260`（180–480）；右栏默认宽 `300`（220–520）
- 无 `saveSchema`；无 Fragment 方法；不加入 `bootstrapPhonePluginApps`
- 作者注释头：含文件名、作者「池水三两升」、日期、版本；中文沟通；代码注释详细
- 文件顶部注释 + 必要空行；不写无关 markdown 文档（除非任务要求）

---

## File Structure

| 路径 | 职责 |
| --- | --- |
| `src/phone-editor/constants.ts` | `PROGRAM_ID`、品牌文案、分区元数据 |
| `src/phone-editor/theme/tokens.ts` | `ThemeMode` / `ThemeTokens` / `getThemeTokens` |
| `src/phone-editor/theme/theme-provider.tsx` | `ThemeProvider` / `useTheme` / 字号常量 |
| `src/phone-editor/theme/tokens.test.ts` | accent / 模式测试 |
| `src/phone-editor/shell/placeholder-pane.tsx` | 统一空态面板 |
| `src/phone-editor/shell/phone-editor-shell.tsx` | 顶栏 + Tab + 三栏 |
| `src/phone-editor/app/phone-editor-app.tsx` | 读 settings → Provider → Shell |
| `src/phone-editor/index.tsx` | `PhoneEditorExtension` |
| `src/index.tsx` | 导出 `PhoneEditorExtension` |

---

### Task 1: 主题 token + 常量

**Files:**
- Create: `src/phone-editor/constants.ts`
- Create: `src/phone-editor/theme/tokens.ts`
- Create: `src/phone-editor/theme/tokens.test.ts`

**Interfaces:**
- Produces: `PROGRAM_ID = "phone-editor"`；`BRAND_LABEL = "手机"`；`EditorSection` 与 `EDITOR_SECTIONS`；`getThemeTokens(mode): ThemeTokens`（`accent` 深色 `#DB2777`）

- [ ] **Step 1: 写失败测试**

```ts
// src/phone-editor/theme/tokens.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getThemeTokens } from "./tokens";

describe("getThemeTokens", () => {
  it("dark accent is #DB2777", () => {
    assert.equal(getThemeTokens("dark").accent, "#DB2777");
  });

  it("light accent is pink family", () => {
    const accent = getThemeTokens("light").accent.toUpperCase();
    assert.ok(accent === "#DB2777" || accent === "#BE185D");
  });

  it("dark bgBase is near #17171B", () => {
    assert.equal(getThemeTokens("dark").bgBase.toUpperCase(), "#17171B");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test src/phone-editor/theme/tokens.test.ts`  
Expected: FAIL（模块不存在或 `getThemeTokens` 未定义）

- [ ] **Step 3: 实现 constants + tokens**

`constants.ts`：

```ts
/**
 * @file constants.ts
 * @description 手机编辑器模块常量：程序 ID、品牌与分区元数据。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

/** Studio 程序 ID / `@extension({ id })`。 */
export const PROGRAM_ID = "phone-editor";

/** 顶栏品牌文案（与场景交互「场景交互」对称，此处为「手机」）。 */
export const BRAND_LABEL = "手机";

/** 扩展程序标签（Studio 程序列表显示名）。 */
export const MODULE_LABEL = "手机编辑器";

/** 编辑器顶部分区。 */
export type EditorSection = "shell" | "desktop" | "chat" | "misc";

/**
 * 分区元数据（顺序即 Tab 顺序）。
 */
export const EDITOR_SECTIONS: ReadonlyArray<{
  id: EditorSection;
  label: string;
  centerHint: string;
}> = [
  { id: "shell", label: "外壳", centerHint: "手机外壳预览（即将推出）" },
  { id: "desktop", label: "桌面", centerHint: "桌面图标样式（即将推出）" },
  { id: "chat", label: "聊天气泡", centerHint: "气泡主题预览（即将推出）" },
  { id: "misc", label: "其他", centerHint: "其它手机样式（即将推出）" },
];
```

`tokens.ts`：实现 `ThemeTokens` 接口（字段：`mode, accent, bgBase, bgElevated, bgSunken, border, borderStrong, textPrimary, textSecondary, textMuted`）与 `getThemeTokens`：
- dark：`accent #DB2777`，`bgBase #17171B`，`bgElevated #1F1F26`，`bgSunken #121217`，边框/文本对齐场景交互深色可读性
- light：`accent #BE185D`（或 `#DB2777`），浅底深字

- [ ] **Step 4: 再跑测试**

Run: `node --import tsx --test src/phone-editor/theme/tokens.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/phone-editor/constants.ts src/phone-editor/theme/tokens.ts src/phone-editor/theme/tokens.test.ts
git commit -m "feat(phone-editor): 主题 token 与分区常量"
```

---

### Task 2: ThemeProvider

**Files:**
- Create: `src/phone-editor/theme/theme-provider.tsx`

**Interfaces:**
- Consumes: `getThemeTokens`, `ThemeMode`, `ThemeTokens` from `./tokens`
- Produces: `ThemeProvider`、`useTheme()`、`FONT_SIZE_DEFAULT = 13`、`FONT_SIZE_TITLE = 14`、`FONT_FAMILY_UI`、`rootTypographyStyle`

- [ ] **Step 1: 实现 ThemeProvider**

参考 `ext-27b96b/src/theme/theme-provider.tsx`，但**不要**引入 Font Awesome / 场景交互共享依赖。要求：

```tsx
export interface ThemeProviderProps {
  initialMode?: ThemeMode;
  children: React.ReactNode;
}

export function ThemeProvider({ initialMode = "dark", children }: ThemeProviderProps): React.ReactElement;

export function useTheme(): ThemeContextValue; // 未包裹时 throw
```

根节点：`height/width 100%`、`display flex`、`flexDirection column`、背景 `tokens.bgBase`、色 `tokens.textPrimary`、展开 `rootTypographyStyle`。

- [ ] **Step 2: 手工类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`（若项目无全量 tsc 脚本则靠下一步 Vite build）  
Expected: 无本文件相关错误

- [ ] **Step 3: Commit**

```bash
git add src/phone-editor/theme/theme-provider.tsx
git commit -m "feat(phone-editor): ThemeProvider"
```

---

### Task 3: PlaceholderPane + PhoneEditorShell

**Files:**
- Create: `src/phone-editor/shell/placeholder-pane.tsx`
- Create: `src/phone-editor/shell/phone-editor-shell.tsx`

**Interfaces:**
- Consumes: `useTheme`、`EDITOR_SECTIONS`、`BRAND_LABEL`、`EditorSection`
- Produces: `PhoneEditorShell({ section, onSectionChange, leftWidth, rightWidth, onToggleTheme })`

- [ ] **Step 1: 实现 PlaceholderPane**

```tsx
export interface PlaceholderPaneProps {
  title: string;
  description?: string;
}

export function PlaceholderPane({ title, description }: PlaceholderPaneProps): React.ReactElement;
```

样式：填满父级、虚线边框 `tokens.border`、背景 `tokens.bgSunken`、居中标题与次要说明。

- [ ] **Step 2: 实现 PhoneEditorShell**

行为对齐 spec §3：

1. 顶栏：accent 色块 + `BRAND_LABEL`「手机」
2. `role="tablist"`：四个 Tab，选中用 accent 描边 + `#DB277722` 底；`data-testid={`phone-editor-section-${id}`}`
3. 右侧：主题切换按钮（调用 `onToggleTheme`）+「运行预览」按钮 `disabled`
4. body 三栏：
   - left：`width: leftWidth`，`PlaceholderPane title={`${sectionLabel} · 导航 / 列表`}`
   - center：`flex:1`，`PlaceholderPane title={centerHint}`
   - right：`width: rightWidth`，`PlaceholderPane title={`${sectionLabel} · 属性`}`
5. 根容器 `height:100%` / `display:flex` / `flexDirection:column`；栏分隔 `1px solid tokens.border`

`sectionLabel` / `centerHint` 从 `EDITOR_SECTIONS` 按当前 `section` 查找。

顶栏按钮样式可内联小工厂（同场景交互 `topBarButtonStyle`，主按钮白字 `@ accent`）。

- [ ] **Step 3: Commit**

```bash
git add src/phone-editor/shell/placeholder-pane.tsx src/phone-editor/shell/phone-editor-shell.tsx
git commit -m "feat(phone-editor): 外壳 Shell 与占位面板"
```

---

### Task 4: App + Extension 模块 + 入口导出

**Files:**
- Create: `src/phone-editor/app/phone-editor-app.tsx`
- Create: `src/phone-editor/index.tsx`
- Modify: `src/index.tsx`

**Interfaces:**
- Consumes: Shell / ThemeProvider / `PROGRAM_ID` / `MODULE_LABEL`
- Produces: `export class PhoneEditorExtension`；入口 `export { PhoneEditorExtension }`

- [ ] **Step 1: PhoneEditorApp**

```tsx
export function PhoneEditorApp(): React.ReactElement {
  const ctx = useExtensionContext();
  const [themeSetting] = ctx.settings.useValue<"light" | "dark">("theme");
  const [leftWidth] = ctx.settings.useValue<number>("editorLeftWidth");
  const [rightWidth] = ctx.settings.useValue<number>("editorRightWidth");
  const [section, setSection] = useState<EditorSection>("shell");
  const mode = themeSetting === "light" ? "light" : "dark";

  return (
    <ThemeProvider key={mode} initialMode={mode}>
      <PhoneEditorShell
        section={section}
        onSectionChange={setSection}
        leftWidth={typeof leftWidth === "number" ? leftWidth : 260}
        rightWidth={typeof rightWidth === "number" ? rightWidth : 300}
        onToggleTheme={() => {
          ctx.settings.set("theme", mode === "dark" ? "light" : "dark");
        }}
      />
    </ThemeProvider>
  );
}
```

说明：`ThemeProvider` 用 `key={mode}` 以便 settings 变更时重置内部 mode；若实现里 Provider 支持受控 `mode`，可改为受控，不必强求 `key`。

- [ ] **Step 2: PhoneEditorExtension**

```tsx
@extension({ id: PROGRAM_ID, label: MODULE_LABEL })
export class PhoneEditorExtension extends Extension {
  static settings = settings((s) => ({
    theme: s
      .enum("界面主题", ["light", "dark"] as const)
      .labels({ light: "浅色", dark: "深色" })
      .default("dark"),
    editorLeftWidth: s
      .number("编辑器左栏宽度")
      .default(260)
      .range(180, 480),
    editorRightWidth: s
      .number("编辑器右栏宽度")
      .default(300)
      .range(220, 520),
  }));

  render() {
    return { component: PhoneEditorApp, props: {} };
  }
}

export default PhoneEditorExtension;
```

- [ ] **Step 3: 修改 `src/index.tsx`**

在现有导出后增加：

```tsx
export { PhoneEditorExtension } from "./phone-editor";
```

更新文件头 `@remarks`：补充多模块含 `phone-editor`（作者工具，非内页）。

- [ ] **Step 4: Build**

Run: `npm run build`  
Expected: Vite 成功产出 `dist/index.mjs`，无 TS 错误

- [ ] **Step 5: Commit**

```bash
git add src/phone-editor/app/phone-editor-app.tsx src/phone-editor/index.tsx src/index.tsx
git commit -m "feat(phone-editor): 导出手机编辑器外壳模块"
```

---

### Task 5: 文档补丁与验收清单

**Files:**
- Modify: `src/README.md`（§7 或模块表旁加一行 phone-editor）
- Optional: `README.md` 一句「作者工具：手机编辑器程序」

- [ ] **Step 1: 更新开发者 README 模块表**

增加一行：

| 模块 | 类 | 程序 ID | 说明 |
| 手机编辑器 | `PhoneEditorExtension` | `phone-editor` | 作者样式编辑外壳（强调色 `#DB2777`）；非内页 APP |

- [ ] **Step 2: 本地验收清单（人工）**

1. `npm run build` 通过  
2. Studio 重载扩展 → 程序列表可见「手机编辑器」  
3. 打开 UI：顶栏粉色点缀、四 Tab 切换占位文案、运行预览禁用、主题切换生效  

- [ ] **Step 3: Commit**

```bash
git add src/README.md README.md
git commit -m "docs: 记载 phone-editor 外壳模块"
```

---

## Spec coverage (self-review)

| Spec 项 | Task |
| --- | --- |
| D2 模块 id phone-editor | Task 4 |
| accent #DB2777 | Task 1 |
| 顶栏 + 四 Tab + 三栏占位 | Task 3 |
| settings theme / 栏宽 | Task 4 |
| 不入 bootstrap | Task 4（只 export） |
| 运行预览禁用 | Task 3 |
| 验收 | Task 5 |
| 非目标（画布/写回/方法） | 全计划未包含 |

无 TBD 占位；类型名在 Task 间一致（`EditorSection` / `PROGRAM_ID` / `getThemeTokens`）。
