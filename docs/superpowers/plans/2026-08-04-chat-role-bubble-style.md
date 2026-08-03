# 聊天角色预设气泡样式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为聊天角色预设增加可选字号/文字色/名称色/气泡色与安全自定义 CSS；未填用默认；customCss 优先于结构化字段；样式打进消息快照。

**Architecture:** 新建纯函数模块负责消毒与 style 合并；`normalizeChatRolePresets` / `collectStoryMessages` / `render` 写入快照；`PhoneStoryMessageItem` 将结构化样式与解析后的 customCss 应用到 bubble / `p` / `strong`。

**Tech Stack:** TypeScript、React、`node:test`（`cd cli; pnpm exec tsx --test <file>`）、现有 `sanitizeBackgroundCss` 模式。

## Global Constraints

- 规格：`docs/superpowers/specs/2026-08-04-chat-role-bubble-style-design.md`
- 优先级：`customCss` > 结构化字段 > 默认 CSS
- `customCss`：仅声明列表；禁 `url(` / `@` / `{` / `}`；最长 2048；非法整段丢弃
- 颜色：`#RGB` / `#RRGGBB` / `#RRGGBBAA`
- 字号：纯数字→`px`；允许 `px`/`rem`/`em`；建议等价 10–32px，超出丢弃
- `bubbleColor`：hex 或单段安全 background（同壁纸规则）
- 不做方法块样式覆盖、不做自定义显示名、不改头像/状态角标
- phone-sdk 版本 → `0.4.4`
- 文件头/中文详细注释；作者：池水三两升
- 每 Task 结束单独 commit

## File Structure

| 文件 | 职责 |
|------|------|
| `phone-sdk/src/host/phone/extension/chat-role-bubble-style.ts` | 消毒、归一化、style 合并 |
| `phone-sdk/src/host/phone/extension/chat-role-bubble-style.test.ts` | 单测 |
| `phone-sdk/src/host/phone/extension/phone-extension.tsx` | 预设字段、快照、settings |
| `phone-sdk/src/host/phone/ui/components/story-message-item.tsx` | 应用 style |
| `phone-sdk/package.json` | 0.4.4 |
| `README.md` | §1 / §8 |

---

### Task 1: 样式消毒与合并纯函数 + 单测

**Files:**
- Create: `phone-sdk/src/host/phone/extension/chat-role-bubble-style.ts`
- Create: `phone-sdk/src/host/phone/extension/chat-role-bubble-style.test.ts`

**Interfaces:**
- Produces:
  - `export interface ChatRoleBubbleStyleFields { fontSize?: string; textColor?: string; nameColor?: string; bubbleColor?: string; customCss?: string }`
  - `export function normalizeHexColor(value: unknown): string | undefined`
  - `export function normalizeFontSize(value: unknown): string | undefined`
  - `export function normalizeBubbleColor(value: unknown): string | undefined`（复用/对齐 `sanitizeBackgroundCss` 逻辑；可从 `../catalog/preferences` import `sanitizeBackgroundCss` 处理非 hex）
  - `export function sanitizeBubbleCustomCss(value: unknown): string | undefined`
  - `export function normalizeChatRoleBubbleStyle(raw: Record<string, unknown>): ChatRoleBubbleStyleFields`
  - `export function buildBubbleStyleParts(style: ChatRoleBubbleStyleFields): { bubble: React.CSSProperties; name: React.CSSProperties; body: React.CSSProperties }`  
    （为避免 React 类型依赖，返回 `Record<string, string>` 即可，或 `import type { CSSProperties } from "react"`）

合并规则（锁定）：

1. 结构化 → `body.fontSize` / `body.color` / `name.color` / `bubble.background`
2. 解析 `customCss` 为声明 map（kebab→camel）
3. 将 map 合并进 `bubble`；其中 `fontSize`/`color` **同时**合并进 `body`（customCss 覆盖结构化）
4. `name` 仅结构化 `nameColor`（customCss 不改 strong，除非声明 `--phone-name-color` 则写入 `name.color`）

- [ ] **Step 1: 写失败单测**

覆盖：合法 hex/字号；非法丢弃；customCss 拒 `url(`；customCss `background` 覆盖 bubbleColor；`font-size` 进 body。

- [ ] **Step 2: 跑测确认 RED**

```powershell
cd cli; pnpm exec tsx --test ../phone-sdk/src/host/phone/extension/chat-role-bubble-style.test.ts
```

- [ ] **Step 3: 实现模块使 GREEN**

- [ ] **Step 4: 再跑测 PASS**

- [ ] **Step 5: Commit**

```powershell
git add phone-sdk/src/host/phone/extension/chat-role-bubble-style.ts phone-sdk/src/host/phone/extension/chat-role-bubble-style.test.ts
git commit -m "feat(phone-sdk): 气泡样式消毒与合并纯函数"
```

---

### Task 2: 预设 / 快照 / settings

**Files:**
- Modify: `phone-sdk/src/host/phone/extension/phone-extension.tsx`
- Modify: `phone-sdk/package.json` → `0.4.4`

**Interfaces:**
- Consumes: `normalizeChatRoleBubbleStyle` / `ChatRoleBubbleStyleFields`
- Produces: `ChatRolePreset` 与 `PhoneStoryMessage` 带可选样式字段；settings 五字段；collect/render 透传

- [ ] **Step 1:** 扩展 `ChatRolePreset`、`PhoneStoryMessage` 可选样式字段（JSDoc 中文）

- [ ] **Step 2:** `normalizeChatRolePresets` 调用 `normalizeChatRoleBubbleStyle(raw)` 展开写入

- [ ] **Step 3:** `collectStoryMessages` / `render` 拷贝样式字段到快照

- [ ] **Step 4:** `chatRolePresets` settings 增加：

```ts
fontSize: item.string("字体大小").default(""),
textColor: item.string("文字颜色").default(""),
nameColor: item.string("名称颜色").default(""),
bubbleColor: item.string("对话框颜色").default(""),
customCss: item.string("自定义 CSS").default(""), // 若 builder 支持 multiline 则加上；否则 string + describe 提示多行
```

更新 `.describe`：说明未填用默认；customCss 为声明列表且优先于结构化字段。

- [ ] **Step 5:** `pnpm build` 通过；version `0.4.4`

- [ ] **Step 6: Commit**

```powershell
git commit -m "feat(phone-sdk): 聊天角色预设写入气泡样式快照"
```

---

### Task 3: UI 应用样式

**Files:**
- Modify: `phone-sdk/src/host/phone/ui/components/story-message-item.tsx`
- Modify: `phone-sdk/src/host/phone/ui/styles/phone.css`（仅当需要 `color: inherit` 等钩子时）

**Interfaces:**
- Consumes: `buildBubbleStyleParts` + 消息上的样式字段

- [ ] **Step 1:** 从 `storyMessage` 取样式字段，调用 `buildBubbleStyleParts`

- [ ] **Step 2:**  
  - `.phone-story-bubble` → `style={bubble}`  
  - `<strong>` → `style={name}`（若有）  
  - `<p>` → `style={body}`（若有）

- [ ] **Step 3:** 无样式字段时不传 `style`（或空对象），outgoing 默认色保持

- [ ] **Step 4:** `pnpm build`

- [ ] **Step 5: Commit**

```powershell
git commit -m "feat(phone-sdk): 消息气泡应用预设自定义样式"
```

---

### Task 4: README

**Files:**
- Modify: `README.md`（版本头 0.4.4；§1；§8）

- [ ] **Step 1:** §1 去掉「不支持自定义气泡 CSS」，改为预设可配样式、未填默认、customCss 优先

- [ ] **Step 2:** §8 表增加五字段与优先级/安全说明

- [ ] **Step 3: Commit**

```powershell
git commit -m "docs: 说明聊天角色预设气泡样式字段"
```

---

## Spec Coverage

| 规格 | Task |
|------|------|
| 五字段 + 未填默认 | 1–3 |
| customCss 优先 | 1, 3 |
| 安全消毒 | 1 |
| 快照 | 2 |
| README / 0.4.4 | 2, 4 |
