<!--
  @file 2026-08-09-story-message-recall-design.md
  @description 消息手机剧情消息「撤回」状态设计规格
  @author 池水三两升
  @date 2026-08-09
  @version 1.0.0
-->

# 消息手机：剧情消息撤回（Recall）

## 背景

作者希望在消息手机（`show-message` / phone-sdk 宿主）中为词条配置「撤回」：消息先以正常气泡发出，若干秒后气泡动态消失，留下居中系统灰字（如「春日野穹撤回了一条消息」）。对方与我方均可使用。

**范围：** 仅消息手机（`phone-sdk` 宿主剧情消息）。**不包含**聊天仓 `app-015abe`。

## 目标

1. 作者可将单条词条状态设为「撤回」。
2. 先展示正常气泡，默认 **3 秒**（作者可改）后撤回。
3. 撤回后：气泡动态消失，只留居中系统行。
4. 系统行文案 = **角色名（自动）** + **作者填的后缀**（默认「撤回了一条消息」）。
5. 角色名取该条消息绑定的聊天角色预设对应角色名（incoming / outgoing 相同规则）。
6. 倒计时未结束时玩家推进：立刻完成撤回，再执行本次推进。

## 非目标

- 聊天内页 APP（`app-015abe`）的撤回。
- 玩家在手机设置里配置全局撤回延迟。
- 撤回后仍保留原气泡内容（打码/灰化）的形态。
- 整句模板 `{name}` 占位（采用「后缀 + 自动前缀名」）。

## 作者配置（`show-message` 每条词条）

在现有 `status{N}` 枚举中增加：

| value | 标签 |
| --- | --- |
| `recalled` | 撤回 |

新增字段（仅 `status === recalled` 时语义生效，仿 `blockedHint`）：

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `recallDelayMs{N}` | number | `3000` | 出现后到撤回的毫秒；`< 0` 按 `0`；建议 clamp `0…60000` |
| `recallText{N}` | string | `撤回了一条消息` | **后缀**；空则回退默认后缀 |

`direction` 仍为 `incoming | outgoing`；`normalizeMessageStatus` 对撤回态 **不得** 把 incoming 强制改成 `read`（与现有「incoming 恒为 read」规则冲突处：`recalled` 为例外）。

## 运行时模型

### 快照字段扩展（`PhoneStoryMessage`）

在现有字段上增加：

```ts
status: ... | "recalled";
/** 作者配置的撤回延迟；仅初始 status 为 recalled 时有值 */
recallDelayMs?: number;
/** 作者配置的撤回后缀；仅初始 status 为 recalled 时有值 */
recallText?: string;
/**
 * 展示阶段：
 * - pending：尚未触发撤回计时完成，仍显示气泡（内容为 message）
 * - recalling：正在播气泡消失动画
 * - done：仅显示系统行
 */
recallPhase?: "pending" | "recalling" | "done";
```

收集阶段（`collectStoryMessages`）：

- 若 `status === "recalled"`：写入 `recallDelayMs` / `recallText`（规范化后），`recallPhase: "pending"`。
- 初始展示仍用气泡渲染 `message`（不直接以系统行出现）。

### 计时与阶段迁移

1. **启动时机**：该条消息被追加到 `activeStoryMessages` 时（首条展示或 `advance` append）。
2. **pending → recalling**：`setTimeout(recallDelayMs)` 到期，或玩家推进时对该条执行「立即撤回」。
3. **recalling → done**：气泡消失动画结束（建议 ~220–280ms，与现有入场时长同阶；`prefers-reduced-motion` 时跳过动画直接 done）。
4. **系统行文案**（done）：`{displayName}{recallText}`  
   - `displayName`：UI 侧 `ctx.character.useCharacter(characterId)?.name`，回退 `characterId` /「未知角色」。
5. **清理**：序列结束、Esc 关闭、`hidePhoneUi`、runtime 失活时清除该 Preview 上所有撤回 timer。

### 与推进（`advanceStoryMessage`）的交互

当玩家点击推进时，若 `activeStoryMessages` 中存在 `status === "recalled"` 且 `recallPhase !== "done"`：

1. 将这些消息立即切到 `recalling`（取消对应 timer），并在短动画后至 `done`；**或**为降低复杂度：立即置 `done` 并跳过动画（推荐：**短动画仍播，但本次 advance 在动画结束后再继续**会卡住点击手感）。

**推荐落地（与已确认选项 A 对齐、且不拖垮点击）：**

- 推进时：所有未完成撤回的消息 **立刻** `recallPhase = "done"`（可带极短 CSS 过渡），取消 timer；
- 然后在同一轮继续执行原有 advance 逻辑（`marked-read` / `appended` / `finished` / `close`）。

即：「立刻变成撤回系统行，再推进下一条」。

### 与 unread→read 的关系

撤回消息不参与「我方 unread 先标 read」的特殊路径（`status` 不是 `unread`）。无需额外分支，除非作者误配（不允许 recalled 同时当 unread）。

## UI

### 列表渲染（`phone-ui-content` + `PhoneStoryMessageItem`）

- `recallPhase === "pending" | "recalling"`：渲染气泡（recalling 时加离开动画 class）。
- `recallPhase === "done"`：**不渲染气泡**，渲染居中系统行（新 class，可复用/扩展 `.phone-story-blocked-hint` 风格为 `.phone-story-recall-hint`）。
- 系统行文案在组件内用角色名 + `recallText` 拼接。

### 无障碍

- 系统行 `role="status"` 或合适 aria-label：「某角色撤回了一条消息」。

## 快进 / skip

现有 `runImmediately` / `skip` 对 `show-message` 为空实现，**保持不变**（不弹消息 UI，故无撤回动画）。

## 版本与文档

- 宿主扩展与 phone-sdk 小版本递增（实现阶段定具体号）。
- 更新根 `README.md` / `src/README.md` 消息手机一节：说明撤回状态、字段默认值与推进行为。

## 测试要点

1. incoming recalled：3s 后气泡消失，系统行含对方角色名 + 默认后缀。
2. outgoing recalled：系统行含预设角色名（非固定「我」）。
3. 自定义 `recallDelayMs` / `recallText`。
4. 倒计时中点击：立刻系统行，并追加下一条。
5. 关闭手机：无残留 timer / 无报错。
6. `appendToExisting` 接续时，新追加的撤回条独立计时。

## 自检

- [x] 无 TBD / 占位符
- [x] 与「仅消息手机、非聊天仓」一致
- [x] 延迟默认 3s、作者可改；后缀 + 自动名前缀
- [x] 气泡动态消失 → 仅系统行
- [x] 推进时立即撤回再继续
- [x] incoming 强制 read 规则对 recalled 的例外已写明
