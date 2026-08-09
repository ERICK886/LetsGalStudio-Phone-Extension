# 消息手机剧情消息撤回 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在消息手机 `show-message` 中支持 `recalled`：先发气泡，默认 3 秒后气泡消失并显示「角色名+后缀」系统行；推进时立刻撤回再继续。

**Architecture:** 扩展 `PhoneStoryMessage` 快照与 `normalizeMessageStatus`；runtime 维护撤回 timer；UI 按 `recallPhase` 在气泡与系统行间切换。

**Tech Stack:** TypeScript / React / phone-sdk 宿主 / AVG Studio Fragment schema

## Global Constraints

- 仅消息手机（`phone-sdk`），不改 `app-015abe`
- 延迟默认 `3000`，后缀默认 `撤回了一条消息`
- incoming 的 `recalled` 不得被强制改成 `read`
- 推进时未完成撤回 → 立刻 `recallPhase=done` 再 advance

---

### Task 1: 类型 / 归一化 / schema / collect

**Files:**
- Modify: `phone-sdk/src/host/phone/extension/phone-extension.tsx`

- [ ] `PhoneMessageStatus` 增加 `recalled`；`OUTGOING_MESSAGE_STATUSES` 同步（或拆出双方共用白名单）
- [ ] `normalizeMessageStatus`：`value === "recalled"` 时双方均返回 `recalled`
- [ ] `PhoneStoryMessage` 增加 `recallDelayMs?` / `recallText?` / `recallPhase?`
- [ ] schema：`status` 选项加「撤回」；每条加 `recallDelayMs{N}`（default 3000）、`recallText{N}`
- [ ] `collectStoryMessages` + Preview 输入路径：recalled 时写入规范化字段与 `recallPhase: "pending"`

### Task 2: Runtime 计时与推进联动

**Files:**
- Modify: `phone-sdk/src/host/phone/extension/phone-extension.tsx`

- [ ] `PhoneRuntime` 增加 `recallTimers: Map<number, number>`（key=消息在 active 列表索引或稳定 token）
- [ ] `scheduleStoryMessageRecall(runtime, index)`：timeout → pending→recalling→done（或简化：timeout 直接 recalling 短动画后 done）
- [ ] 在 append 首条 / advance append 后调度
- [ ] `advanceStoryMessage` 开头：`finalizePendingRecalls(runtime)`（立刻 done + clear timers）再原逻辑
- [ ] deactivate / 序列结束清理 timers

### Task 3: UI 气泡消失 + 系统行

**Files:**
- Modify: `phone-sdk/src/host/phone/ui/components/story-message-item.tsx`
- Modify: `phone-sdk/src/host/phone/ui/phone-ui-content.tsx`
- Modify: `phone-sdk/src/host/phone/ui/styles/phone.css`

- [ ] `recallPhase === "done"`：不渲染气泡，渲染 `.phone-story-recall-hint`（角色名+recallText）
- [ ] `recalling`：离开动画；`pending`：正常气泡（可隐藏 status 指示或显示发送中）
- [ ] CSS 动画 + reduced-motion

### Task 4: 文档与版本

**Files:**
- Modify: `phone-sdk/package.json`、根 `package.json` / `extension.json`、`README.md`、`src/README.md`

- [ ] bump phone-sdk / 宿主小版本
- [ ] 文档补充撤回说明
- [ ] `pnpm build` 通过
