# 消息手机：隐藏头像与名称

> 文件名：`2026-08-04-message-phone-hide-avatar-name-design.md`  
> 作者：Cursor Agent  
> 日期：2026-08-04  
> 版本：1.1  
> 状态：已批准；1.1 更正为方法块组级双开关（非每条）

## 1. 背景与目标

消息手机气泡当前**始终**显示头像区与资产角色名称。作者需要在部分场景（匿名消息、系统提示感气泡、只露正文等）下独立关闭头像和/或名称。

### 目标

- 聊天角色预设提供两个开关：显示头像、显示名称（默认均开启）。
- `show-message` 方法块提供**两个组级开关**（非每条），作用于本组全部消息。
- **方法优先级高于预设**；选「跟随预设」时各条仍用各自预设。
- 隐藏后采用紧凑布局：不占头像位、不占名称行。

### 非目标

- 自定义显示名（改名）或自定义气泡 CSS。
- 每条消息各自一套显示开关。
- 改变现有头像回退链路（`avatarSource` / 素材库 / 立绘）；仅控制是否渲染。

## 2. 配置模型

### 2.1 聊天角色预设（settings）

在 `chatRolePresets` 数组项中新增：

| 字段 | Studio 标签 | 类型 | 默认 | 说明 |
|------|-------------|------|------|------|
| `showAvatar` | 显示头像 | `boolean` | `true` | `false` 时该预设展开的消息默认不渲染头像 |
| `showName` | 显示名称 | `boolean` | `true` | `false` 时该预设展开的消息默认不渲染名称 |

旧项目无这两字段时，归一化视为 `true`。

### 2.2 `show-message` 组级字段（method schema）

方法块仅增加**两个**组级字段（与 `appendToExisting` / `storyBackground` 同级），不对第 1～8 条分别配置：

| 字段 | Studio 标签 | 类型 | 默认 | 取值 |
|------|-------------|------|------|------|
| `showAvatar` | 显示头像（本组） | `enum` | `inherit` | `inherit` 跟随预设 · `show` 显示 · `hide` 隐藏 |
| `showName` | 显示名称（本组） | `enum` | `inherit` | 同上 |

不使用「缺省 boolean」表示跟随：Studio 勾选框无法区分「未设置」与「关闭」。

### 2.3 解析优先级

对组内每条有效消息，最终布尔值：

```text
resolve(groupMethodEnum, presetBool):
  if groupMethodEnum === "show" → true（本组全部）
  if groupMethodEnum === "hide" → false（本组全部）
  if groupMethodEnum === "inherit" 或非法/缺失 → 该条自身的 presetBool（缺失预设字段时为 true）
```

头像与名称**各自独立**解析，互不影响。

## 3. 数据流与快照

### 3.1 类型

`ChatRolePreset` 增加：

```ts
showAvatar: boolean;
showName: boolean;
```

`PhoneStoryMessage` 增加（**已解析后的最终值**，播放期不再读 settings）：

```ts
showAvatar: boolean;
showName: boolean;
```

### 3.2 归一化与收集

1. `normalizeChatRolePresets`：读取 `showAvatar` / `showName`；非严格 `false` 则视为 `true`（兼容旧数据与脏值）。
2. `collectStoryMessages`：对每条消息用 §2.3 解析后写入快照。
3. `PhoneExtension.render` 过滤/映射宿主传入的消息对象时，同样带上这两字段；缺失时默认 `true`。

预设仍要求有效 `characterId`（与现状一致）。隐藏名称/头像**不**允许无预设；角色 ID 仍用于诊断与（在显示时）解析头像/名称。

## 4. UI 行为

文件：`phone-sdk/src/host/phone/ui/components/story-message-item.tsx`（及必要时 CSS）。

| 条件 | 行为 |
|------|------|
| `showAvatar === true` | 保持现有头像候选与回退（含首字） |
| `showAvatar === false` | **不渲染** `.phone-story-avatar`，不留空白占位 |
| `showName === true` | 气泡内继续渲染 `<strong>`（资产角色名，逻辑不变） |
| `showName === false` | **不渲染** `<strong>` |
| 两者皆 false | 仅正文 + 状态指示；incoming/outgoing 左右对齐不变 |

无障碍：行级 `aria-label` 在隐藏名称时使用「对方发来的消息」/「我方发送的消息」，不拼接角色名（与当前无角色名时的表述一致即可）。

## 5. 文档与版本

- 更新根 `README.md` §1 限制、§8、§9：说明双开关与方法覆盖。
- 去掉「聊天气泡名称固定且不可隐藏」类过时限制（名称仍取自资产角色，但可隐藏）。
- phone-sdk 随功能发版时递增 patch/minor（实现计划中定具体版本号）。

## 6. 测试要点

- 预设关头像 / 关名称 / 都关 → UI 符合 §4。
- 预设开 + 方法 `hide` → 隐藏（方法优先）。
- 预设关 + 方法 `show` → 显示。
- 方法 `inherit` 或缺省 → 跟随预设；旧消息无字段 → 都显示。
- 快照：播放中途改 settings 不影响已展开消息。
- 回归：未配置新字段的现有剧情视觉与行为不变。

## 7. 实现落点（供计划拆分）

| 区域 | 文件（预期） |
|------|----------------|
| 类型 / 预设归一化 / collect / schema / render | `phone-sdk/src/host/phone/extension/phone-extension.tsx` |
| 气泡渲染 | `phone-sdk/src/host/phone/ui/components/story-message-item.tsx` |
| 紧凑布局（若需） | `phone-sdk/src/host/phone/ui/styles/phone.css` |
| 说明 | `README.md` |
| 单测（若已有 collect/normalize 测） | 对应 `*.test.ts` 或新增 |

## 8. 决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 控制粒度 | 预设默认 + 方法块组级双开关 | 作者更正：方法内不按条配置，整组两个开关 |
| 方法字段形态 | 三态 enum | 避免 boolean 与「跟随」冲突 |
| 隐藏布局 | 紧凑、不占位 | 匿名/正文向场景更干净 |
| 显示名改写 | 不做 | 本轮只要隐藏，不改名 |
