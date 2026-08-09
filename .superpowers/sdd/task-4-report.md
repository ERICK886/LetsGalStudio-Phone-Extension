# Task 4 报告：UI 订阅 navigate 并深开内页

## Status
✅ 完成

## Commits
- `feat(phone-sdk): UI 订阅 openPhoneApp 导航请求`

## Build
`pnpm build` 通过（vite build，274.17 kB / gzip 65.54 kB，364ms，无错误无 lint 警告）。

## 实现要点

### Step 1：抽取 `openInPhoneAppById(phoneAppId, originAppId?)`
- 从 `launchApp` 的 `in-phone-app` 分支抽出共享逻辑：注册表 lookup（`lookupPhoneSdkApp`）、未命中 `phoneSdkDiagWarn` + `showMessage` warn 并返回（不抛错）、`setEditorOpen(false)`、provisional safe area、origin、`setInAppPhase("entering")`、`setActiveInPhoneAppId`。
- 新增可选 `originAppId`：苹果预设下用 `resolveInAppOriginFromIcon(originAppId ?? phoneAppId)` 计算从图标中心放大的 transform-origin；导航总线驱动（无桌面图标）时回退屏幕中部偏上。
- `launchApp` 的 `in-phone-app` 分支改为 `openInPhoneAppById(app.action.target.phoneAppId, app.id)` 后 return，保留图标 origin。
- 仅依赖 `registerPhoneApp` 注册表，不要求桌面目录存在对应图标。

### Step 2：`useEffect` 订阅 navigate
- 新增 refs：`openInPhoneAppByIdRef` / `messageModeRef` / `closingRef`，每 render 同步最新值，使订阅回调始终读最新状态而无需重新订阅。
- `useEffect` 空依赖订阅 `subscribePhoneNavigate`：回调内 `messageModeRef` / `closingRef` 为真时忽略，否则 `openInPhoneAppByIdRef.current(req.appId)`。
- `subscribePhoneNavigate` 订阅时立即回放最新 pending，因此挂载即消费 `getLatestPhoneNavigate()`，不会漏掉 UI 挂载前发布的请求；无需单独调用 `getLatestPhoneNavigate()` 以免与回放重复触发。

## Concerns
- 订阅 effect 空依赖 + ref 读取：回调闭包始终读最新 `messageMode` / `closing` / `openInPhoneAppById`，避免 re-render 重新订阅导致 pending 重复回放（重复回放会重启 entering 动画）。
- pending 不会被消费清除；若 UI 在 messageMode 期间挂载，回放被忽略，pending 保留，待 messageMode 结束后不会自动重放——此为既有总线语义，本任务不引入清除 API。正常流程中 `openPhoneApp` 在 show 手机后 publish，UI 此时已非 messageMode。
- 导航总线驱动的打开无桌面图标，苹果 origin 回退 `{x:50%, y:42%}`，与默认一致，视觉可接受。

## Report Path
`.worktrees/feat-open-phone-app/.superpowers/sdd/task-4-report.md`

## Fix: stale navigate pending（2026-08-09）

**问题：** `phoneNavigatePending` 在 UI 消费后未清除；后续 ArrowUp 普通打开手机时 subscribe 回放 stale pending，强制回到 chat 内页。

**修复：**
- 新增 `clearPhoneNavigatePending()`；`emitPhoneClosed()` 同步清除 pending。
- `phone-ui-content` 在 `openInPhoneAppById` 消费后调用 `clearPhoneNavigatePending()`。
- 单测：`clearPhoneNavigatePending` / `emitPhoneClosed` 后 `getLatestPhoneNavigate()` 为 null，新 subscribe 不回放。

**Commit：** `fix(phone-sdk): 消费导航请求后清除 pending`
