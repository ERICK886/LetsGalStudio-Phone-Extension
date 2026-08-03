# 消息手机隐藏头像与名称 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为消息手机增加「显示头像 / 显示名称」双开关：聊天角色预设可配默认，`show-message` 每条可用三态覆盖，方法优先于预设，隐藏时紧凑不占位。

**Architecture:** 抽出纯函数 `resolveStoryVisibility` / `normalizePresetVisibilityFlag` 供单测与 `collectStoryMessages` 共用；预设与方法字段归一化后写入 `PhoneStoryMessage` 快照布尔值；`PhoneStoryMessageItem` 按快照条件渲染，行上打 `data-show-avatar` 供 CSS 放宽 `max-width`。

**Tech Stack:** TypeScript、React、`@avg-studio/sdk` settings/method schema、Node.js `node:test`（经 `cli` 的 `pnpm exec tsx --test`）。

## Global Constraints

- 遵循规格：`docs/superpowers/specs/2026-08-04-message-phone-hide-avatar-name-design.md`
- 方法覆盖取值仅允许：`inherit` | `show` | `hide`（默认 `inherit`）
- 预设布尔默认 `true`；非严格 `false` 一律视为 `true`（兼容旧数据）
- 不改头像回退链路；不做自定义显示名 / 组级总开关 / 气泡 CSS 主题
- 代码注释保持详细（含参数、返回值）；文件头含文件名、作者、日期、版本
- phone-sdk 版本本轮升为 `0.4.1`（向后兼容的小功能）
- 测试运行：`cd cli; pnpm exec tsx --test <test-file>`
- 每个 Task 结束后单独 commit（除非用户当场禁止提交）

## File Structure

| 文件 | 职责 |
|------|------|
| `phone-sdk/src/host/phone/extension/story-message-visibility.ts` | 纯函数：预设布尔归一化、方法三态解析 |
| `phone-sdk/src/host/phone/extension/story-message-visibility.test.ts` | 上述纯函数单测 |
| `phone-sdk/src/host/phone/extension/phone-extension.tsx` | 类型、预设 settings、method schema、`normalizeChatRolePresets`、`collectStoryMessages`、`render` 映射 |
| `phone-sdk/src/host/phone/ui/components/story-message-item.tsx` | 按 `showAvatar` / `showName` 条件渲染 |
| `phone-sdk/src/host/phone/ui/styles/phone.css` | 无头像时消息体 `max-width`；无名称时正文顶边距 |
| `phone-sdk/package.json` | `version` → `0.4.1` |
| `README.md` | §1 / §8 / §9 文档 |

---

### Task 1: 可见性纯函数 + 单测

**Files:**
- Create: `phone-sdk/src/host/phone/extension/story-message-visibility.ts`
- Create: `phone-sdk/src/host/phone/extension/story-message-visibility.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `export type StoryVisibilityOverride = "inherit" | "show" | "hide"`
  - `export const STORY_VISIBILITY_OVERRIDES: readonly StoryVisibilityOverride[]`
  - `export function normalizePresetVisibilityFlag(value: unknown): boolean`
  - `export function resolveStoryVisibility(methodOverride: unknown, presetShow: boolean): boolean`

- [ ] **Step 1: 写失败单测**

创建 `story-message-visibility.test.ts`：

```ts
/**
 * @file story-message-visibility.test.ts
 * @description 消息头像/名称可见性解析单测。
 * @author 池水三两升
 * @date 2026-08-04
 * @version 0.4.1
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizePresetVisibilityFlag,
  resolveStoryVisibility,
} from "./story-message-visibility.ts";

describe("normalizePresetVisibilityFlag", () => {
  it("仅严格 false 为关闭；其余（含缺失）为开启", () => {
    assert.equal(normalizePresetVisibilityFlag(false), false);
    assert.equal(normalizePresetVisibilityFlag(true), true);
    assert.equal(normalizePresetVisibilityFlag(undefined), true);
    assert.equal(normalizePresetVisibilityFlag(null), true);
    assert.equal(normalizePresetVisibilityFlag("false"), true);
    assert.equal(normalizePresetVisibilityFlag(0), true);
  });
});

describe("resolveStoryVisibility", () => {
  it("show / hide 覆盖预设；inherit 与非法值跟随预设", () => {
    assert.equal(resolveStoryVisibility("hide", true), false);
    assert.equal(resolveStoryVisibility("show", false), true);
    assert.equal(resolveStoryVisibility("inherit", false), false);
    assert.equal(resolveStoryVisibility("inherit", true), true);
    assert.equal(resolveStoryVisibility(undefined, false), false);
    assert.equal(resolveStoryVisibility("nope", true), true);
  });
});
```

- [ ] **Step 2: 跑测确认失败**

Run:

```powershell
cd cli; pnpm exec tsx --test ../phone-sdk/src/host/phone/extension/story-message-visibility.test.ts
```

Expected: FAIL（模块不存在或导出缺失）

- [ ] **Step 3: 实现纯函数模块**

创建 `story-message-visibility.ts`：

```ts
/**
 * @file story-message-visibility.ts
 * @description 消息手机头像/名称显示开关：预设布尔归一化与方法三态覆盖解析。
 * @author 池水三两升
 * @date 2026-08-04
 * @version 0.4.1
 */

/** `show-message` 单条对预设开关的覆盖。 */
export type StoryVisibilityOverride = "inherit" | "show" | "hide";

export const STORY_VISIBILITY_OVERRIDES = [
  "inherit",
  "show",
  "hide",
] as const satisfies readonly StoryVisibilityOverride[];

/**
 * 将预设中的「显示头像 / 显示名称」原始值规范为 boolean。
 *
 * @param value - settings 原始值
 * @returns 仅当值为严格 `false` 时返回 `false`，否则 `true`（兼容旧数据）
 *
 * @example
 * normalizePresetVisibilityFlag(false) // false
 * normalizePresetVisibilityFlag(undefined) // true
 */
export function normalizePresetVisibilityFlag(value: unknown): boolean {
  return value !== false;
}

/**
 * 按「方法优先于预设」解析最终是否显示。
 *
 * @param methodOverride - 方法字段：`inherit` | `show` | `hide`；非法或缺失视为 inherit
 * @param presetShow - 预设侧已归一化的布尔
 * @returns 播放快照应写入的最终布尔
 *
 * @example
 * resolveStoryVisibility("hide", true) // false
 * resolveStoryVisibility("inherit", false) // false
 */
export function resolveStoryVisibility(
  methodOverride: unknown,
  presetShow: boolean,
): boolean {
  if (methodOverride === "show") return true;
  if (methodOverride === "hide") return false;
  return presetShow;
}
```

- [ ] **Step 4: 跑测确认通过**

Run: 同 Step 2  
Expected: `pass 2`（或用例总数对应全部通过）

- [ ] **Step 5: Commit**

```powershell
git add phone-sdk/src/host/phone/extension/story-message-visibility.ts phone-sdk/src/host/phone/extension/story-message-visibility.test.ts
git commit -m "feat(phone-sdk): 消息可见性解析纯函数与单测"
```

---

### Task 2: 预设 / 方法 schema / 收集快照 / render

**Files:**
- Modify: `phone-sdk/src/host/phone/extension/phone-extension.tsx`
- Modify: `phone-sdk/package.json`（`version` → `0.4.1`）

**Interfaces:**
- Consumes: `normalizePresetVisibilityFlag`、`resolveStoryVisibility`、`STORY_VISIBILITY_OVERRIDES`（来自 Task 1）
- Produces:
  - `ChatRolePreset` 含 `showAvatar: boolean`、`showName: boolean`
  - `PhoneStoryMessage` 含 `showAvatar: boolean`、`showName: boolean`（最终值）
  - settings 项默认 `showAvatar: true`、`showName: true`
  - method 每条 `showAvatar{N}` / `showName{N}` enum，默认 `inherit`

- [ ] **Step 1: 扩展类型与 import**

在 `phone-extension.tsx` 顶部增加：

```ts
import {
  normalizePresetVisibilityFlag,
  resolveStoryVisibility,
  STORY_VISIBILITY_OVERRIDES,
} from "./story-message-visibility";
```

`ChatRolePreset`：

```ts
interface ChatRolePreset {
  id: string;
  characterId: string;
  avatarSource: ChatRoleAvatarSource;
  avatarAsset?: string;
  showAvatar: boolean;
  showName: boolean;
}
```

`PhoneStoryMessage` 增加：

```ts
  /** 最终是否渲染头像（已合并方法覆盖）。 */
  showAvatar: boolean;
  /** 最终是否渲染名称（已合并方法覆盖）。 */
  showName: boolean;
```

- [ ] **Step 2: 更新 `normalizeChatRolePresets`**

在 `presets.set(id, { ... })` 中写入：

```ts
    presets.set(id, {
      id,
      characterId,
      avatarSource,
      ...(avatarAsset ? { avatarAsset } : {}),
      showAvatar: normalizePresetVisibilityFlag(raw.showAvatar),
      showName: normalizePresetVisibilityFlag(raw.showName),
    });
```

- [ ] **Step 3: 更新 `collectStoryMessages`**

循环内读取：

```ts
    const showAvatar = resolveStoryVisibility(
      params[`showAvatar${suffix}`],
      preset.showAvatar,
    );
    const showName = resolveStoryVisibility(
      params[`showName${suffix}`],
      preset.showName,
    );
```

`messages.push` 增加 `showAvatar`、`showName`。  
debug `slots` 可附带这两字段（可选，便于对照日志）。

- [ ] **Step 4: 更新 `createStoryMessageSchema` 每条槽位**

在每条的 `blockedHint` 旁增加（labels 用中文）：

```ts
          [
            `showAvatar${suffix}`,
            {
              type: "enum",
              label: `第 ${index} 条 · 显示头像`,
              options: [
                { label: "跟随预设", value: "inherit" },
                { label: "显示", value: "show" },
                { label: "隐藏", value: "hide" },
              ],
              default: "inherit",
              required: true,
            } as const,
          ],
          [
            `showName${suffix}`,
            {
              type: "enum",
              label: `第 ${index} 条 · 显示名称`,
              options: [
                { label: "跟随预设", value: "inherit" },
                { label: "显示", value: "show" },
                { label: "隐藏", value: "hide" },
              ],
              default: "inherit",
              required: true,
            } as const,
          ],
```

（`STORY_VISIBILITY_OVERRIDES` 若 schema 需要可用来校验；options 字面量保持与类型一致即可。）

- [ ] **Step 5: 更新 `chatRolePresets` settings**

`array` item 增加：

```ts
        showAvatar: item.boolean("显示头像").default(true),
        showName: item.boolean("显示名称").default(true),
```

`itemDefault` 增加 `showAvatar: true`、`showName: true`。  
更新 `.describe(...)`：说明两开关默认开启；`show-message` 可用「跟随预设 / 显示 / 隐藏」覆盖，方法优先。删掉或改写「角色名可覆盖资产角色名」——本功能不做改名，避免误导。

- [ ] **Step 6: 更新 `render()` 消息映射**

在构造返回对象时：

```ts
              showAvatar: inputMessage.showAvatar !== false,
              showName: inputMessage.showName !== false,
```

（宿主若已带最终布尔则透传；缺失默认显示。）

- [ ] **Step 7: 版本号**

`phone-sdk/package.json`：`"version": "0.4.1"`。

- [ ] **Step 8: 构建冒烟**

Run:

```powershell
pnpm build
```

Expected: 成功生成 `dist/index.mjs`，无 TS 错误。

- [ ] **Step 9: Commit**

```powershell
git add phone-sdk/src/host/phone/extension/phone-extension.tsx phone-sdk/package.json
git commit -m "feat(phone-sdk): 预设与 show-message 支持头像/名称可见性"
```

---

### Task 3: UI 条件渲染 + CSS

**Files:**
- Modify: `phone-sdk/src/host/phone/ui/components/story-message-item.tsx`
- Modify: `phone-sdk/src/host/phone/ui/styles/phone.css`

**Interfaces:**
- Consumes: `PhoneStoryMessage.showAvatar` / `showName`（Task 2）
- Produces: 隐藏时不渲染头像节点与 `<strong>`；行属性 `data-show-avatar="true|false"`

- [ ] **Step 1: 更新 `PhoneStoryMessageItem`**

关键改动要点（保留现有头像候选逻辑，仅包一层条件）：

```tsx
  const showAvatar = storyMessage.showAvatar !== false;
  const showName = storyMessage.showName !== false;
  // characterName 计算保持不变；仅在 showName 时渲染

  return (
    <div
      className="phone-story-message-row"
      data-direction={storyMessage.direction}
      data-status={storyMessage.status}
      data-show-avatar={showAvatar ? "true" : "false"}
      data-show-name={showName ? "true" : "false"}
      aria-label={
        storyMessage.direction === "incoming"
          ? "对方发来的消息"
          : "我方发送的消息"
      }
    >
      {showAvatar ? (
        <div className="phone-story-avatar" aria-hidden="true">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              onLoad={reportAvatarLoaded}
              onError={tryNextAvatar}
            />
          ) : (
            firstGlyph(characterName)
          )}
        </div>
      ) : null}
      <div className="phone-story-message-body">
        <div className="phone-story-message-content">
          <span className="phone-story-status" role="status">
            <MessageStatusIndicator status={storyMessage.status} />
          </span>
          <div className="phone-story-bubble">
            {showName ? <strong>{characterName}</strong> : null}
            <p>{storyMessage.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
```

当 `showAvatar === false` 时，可不跑头像加载日志副作用（可选优化：用 `showAvatar` 短路 `useMemo` 候选；最小实现是仍计算但不渲染即可）。

- [ ] **Step 2: CSS 紧凑布局**

在 `phone.css` 消息区块追加：

```css
[data-phone-root] .phone-story-message-row[data-show-avatar="false"] .phone-story-message-body {
  max-width: 100%;
}

[data-phone-root] .phone-story-bubble > p:first-child {
  margin-top: 0;
}
```

（有 `<strong>` 时 `p` 不是 first-child，仍用原 `margin: 5px 0 0`；无名称时 `p` 为 first-child，顶距归零。）

- [ ] **Step 3: 构建确认**

Run:

```powershell
pnpm build
```

Expected: 成功。

- [ ] **Step 4: Commit**

```powershell
git add phone-sdk/src/host/phone/ui/components/story-message-item.tsx phone-sdk/src/host/phone/ui/styles/phone.css
git commit -m "feat(phone-sdk): 消息气泡按开关隐藏头像与名称"
```

---

### Task 4: README 与验收清单

**Files:**
- Modify: `README.md`（版本头若提及 phone-sdk 则改为 `0.4.1`；§1 / §8 / §9）

**Interfaces:**
- Consumes: 已实现行为（Tasks 1–3）
- Produces: 作者可读说明与验收步骤

- [ ] **Step 1: 更新限制与 §8**

§1「当前不提供的能力」：

- 将「聊天气泡不支持自定义显示名或自定义气泡 CSS；名称固定使用资产角色名称。」改为：  
  「聊天气泡不支持自定义显示名或自定义气泡 CSS；名称仍取自资产角色，但可在预设或 `show-message` 中隐藏头像/名称。」

§8 预设表增加两行：

| 显示头像 | 默认开启；关闭后该预设消息不渲染头像。 |
| 显示名称 | 默认开启；关闭后气泡不显示角色名。 |

并增加短段落：方法字段「第 N 条 · 显示头像/名称」可选跟随预设 / 显示 / 隐藏，**方法优先于预设**。

- [ ] **Step 2: 更新 §9 字段表**

在 §9.1 表增加：

| 显示头像 | `showAvatar` | `showAvatar2`… | 默认 `inherit`；`show` / `hide` 覆盖预设。 |
| 显示名称 | `showName` | `showName2`… | 同上。 |

- [ ] **Step 3: 本地手测清单（写入 commit message 或自测，不必新开文件）**

在 Studio 重载扩展后核对：

1. 预设关头像 → 消息无头像、气泡变宽（`max-width: 100%`）
2. 预设关名称 → 无 `<strong>`，正文顶对齐
3. 预设开 + 方法 hide → 隐藏
4. 预设关 + 方法 show → 显示
5. 旧块无新字段 → 行为与改前一致

- [ ] **Step 4: Commit**

```powershell
git add README.md
git commit -m "docs: 说明消息手机头像/名称可见性开关"
```

---

## Spec Coverage Checklist

| 规格条目 | Task |
|----------|------|
| 预设 `showAvatar` / `showName` boolean 默认 true | Task 2 |
| 方法三态 inherit/show/hide，方法优先 | Task 1 + 2 |
| 快照写入最终布尔；render 缺失默认 true | Task 2 |
| UI 不渲染头像/名称；紧凑不占位 | Task 3 |
| 旧数据兼容 | Task 1 + 2 |
| README | Task 4 |
| 版本 0.4.1 | Task 2 |
| 单测覆盖解析优先级 | Task 1 |

## Plan Self-Review

- 无 TBD /「稍后实现」占位。
- 类型名全程统一为 `showAvatar` / `showName` / `StoryVisibilityOverride`。
- 未包含自定义显示名或组级开关（符合非目标）。
