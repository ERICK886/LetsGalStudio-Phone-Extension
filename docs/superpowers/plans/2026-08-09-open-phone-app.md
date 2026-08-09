# openPhoneApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@ink-zenly/phone-sdk/plugin` 提供 `openPhoneApp`，宿主自动挂载/显示手机并进入指定内页；聊天扩展默认在「对方发送消息 / 等待回复」时调用。

**Architecture:** Plugin 导出 `openPhoneApp` → 调用全局槽位上的导航控制器（由 `PhoneExtension` 安装，闭包持有**手机扩展**的 `ExtensionContext`，因聊天包 ctx 无法 `ui.show("phone")`）。UI 订阅 navigate 总线深开内页；`closePhone` 后 `emitPhoneClosed` 唤醒 `waitUntil:"close"`。

**Tech Stack:** TypeScript、React、`@avg-studio/sdk`、现有 `phone-sdk` client/host 分层；单测用 `node --import tsx --test`。

**Spec:** `docs/superpowers/specs/2026-08-09-open-phone-app-design.md`

## Global Constraints

- API：`openPhoneApp({ appId, waitUntil?: "close"|"none", payload? })`；默认 `waitUntil: "close"`。
- 未挂载：自动 mount；关闭后保持挂载。
- 宿主未安装 / 消息手机占用：`console.warn` + **立即 resolve**（不卡死剧情）。
- `appId` 未注册：仍尝试打开手机 + warn；不抛。
- `show("phone")` 使用 `interactable: false`（与当前关闭挡板修复一致）。
- 深开**不依赖**桌面图标配置；只依赖 `registerPhoneApp`。
- 快进路径由调用方不弹 UI；聊天 `runImmediately`/`skip` 不调用 `openPhoneApp`。
- `await-player-reply` 打开时固定 `waitUntil: "none"`。
- phone-sdk 升至 **0.5.0**；中文文件头与 JSDoc（作者 池水三两升）。
- PowerShell：`;` 连接；`docs/` 提交需 `git add -f`。
- 聊天改动在旁路仓 `C:\Users\20231\Documents\AVG-Extensions\app-015abe`。

---

## File Structure

```text
phone-sdk/
  src/client/
    runtime/types.ts          # OpenPhoneAppOptions；扩展 PhoneSdkHost / slot
    runtime/slot.ts           # navigate 队列、closed waiters、navigation controller
    runtime/open-phone-app.ts # plugin 入口 openPhoneApp()
    runtime/open-phone-app.test.ts
    index.ts                  # 导出
  src/host/phone/
    runtime/phone-navigation.ts   # 宿主控制器：mount/show/navigate/wait close
    runtime/install-host.ts       # 安装时挂上 controller（需绑定 phone ctx）
    extension/phone-extension.tsx # onRegister 绑定 ctx；closePhone emit closed
    ui/phone-ui-content.tsx       # 订阅 navigate，深开内页

app-015abe/   (旁路)
  src/runtime/actions.ts / index.tsx  # 接入 openPhoneApp + 方法参数
  package.json                        # phone-sdk ^0.5.0
```

---

### Task 1: Plugin 类型、槽位与 `openPhoneApp` 外壳（TDD）

**Files:**
- Modify: `phone-sdk/src/client/runtime/types.ts`
- Modify: `phone-sdk/src/client/runtime/slot.ts`
- Create: `phone-sdk/src/client/runtime/open-phone-app.ts`
- Create: `phone-sdk/src/client/runtime/open-phone-app.test.ts`
- Modify: `phone-sdk/src/client/index.ts`

**Interfaces:**
- Consumes: 现有 `PhoneSdkGlobalSlot` / `getPhoneSdkSlot`
- Produces:
  - `OpenPhoneAppWaitUntil`、`OpenPhoneAppOptions`
  - `PhoneNavigationController`（宿主安装）：`openPhoneApp(options): Promise<void>`
  - slot 字段：`navigation?: PhoneNavigationController`
  - `openPhoneApp(options): Promise<void>`（无宿主时 warn + resolve）

- [ ] **Step 1: 扩展类型**

在 `types.ts` 增加：

```ts
export type OpenPhoneAppWaitUntil = "close" | "none";

export interface OpenPhoneAppOptions {
  appId: string;
  waitUntil?: OpenPhoneAppWaitUntil;
  payload?: Record<string, unknown>;
}

export interface PhoneNavigationController {
  openPhoneApp(options: OpenPhoneAppOptions): Promise<void>;
}
```

在 `PhoneSdkGlobalSlot` 增加可选：`navigation?: PhoneNavigationController`。

- [ ] **Step 2: 写失败测试**

```ts
/**
 * @file open-phone-app.test.ts
 * @description openPhoneApp 无宿主时不卡死。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.5.0
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { PHONE_SDK_GLOBAL_KEY } from "./slot.ts";
import { openPhoneApp } from "./open-phone-app.ts";

describe("openPhoneApp", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  });

  it("resolves when navigation host missing", async () => {
    await openPhoneApp({ appId: "chat" });
  });

  it("delegates to slot.navigation", async () => {
    const calls: unknown[] = [];
    const { getPhoneSdkSlot } = await import("./slot.ts");
    getPhoneSdkSlot().navigation = {
      async openPhoneApp(options) {
        calls.push(options);
      },
    };
    await openPhoneApp({ appId: "chat", waitUntil: "none" });
    assert.deepEqual(calls, [{ appId: "chat", waitUntil: "none" }]);
  });
});
```

（若动态 import 不便，改为同步 `getPhoneSdkSlot` 顶层导入。）

- [ ] **Step 3: RED**

```powershell
node --import tsx --test phone-sdk/src/client/runtime/open-phone-app.test.ts
```

Expected: FAIL（模块不存在）

- [ ] **Step 4: 实现 `open-phone-app.ts`**

```ts
export async function openPhoneApp(options: OpenPhoneAppOptions): Promise<void> {
  const appId = String(options.appId ?? "").trim();
  if (!appId) {
    console.warn("[phone-sdk] openPhoneApp: 空 appId，已忽略");
    return;
  }
  const nav = getPhoneSdkSlot().navigation;
  if (!nav) {
    console.warn("[phone-sdk] openPhoneApp: 手机宿主未安装，已忽略", { appId });
    return;
  }
  await nav.openPhoneApp({
    appId,
    waitUntil: options.waitUntil === "none" ? "none" : "close",
    ...(options.payload ? { payload: options.payload } : {}),
  });
}
```

- [ ] **Step 5: GREEN + 导出 + Commit**

```powershell
node --import tsx --test phone-sdk/src/client/runtime/open-phone-app.test.ts
git add phone-sdk/src/client
git commit -m "feat(phone-sdk): 添加 openPhoneApp plugin API 外壳"
```

---

### Task 2: 导航总线（navigate 请求 + closed waiters）纯函数/模块（TDD）

**Files:**
- Create: `phone-sdk/src/client/runtime/phone-nav-bus.ts`
- Create: `phone-sdk/src/client/runtime/phone-nav-bus.test.ts`
- Modify: `phone-sdk/src/client/runtime/slot.ts`（如需挂 bus 状态）
- Modify: `phone-sdk/src/client/index.ts`

**Interfaces:**
- Produces:
  - `publishPhoneNavigate(request: { appId: string; payload?; seq: number })`
  - `subscribePhoneNavigate(listener): () => void`（挂载时重放最新 pending）
  - `emitPhoneClosed()`
  - `waitForPhoneClosed(): Promise<void>`（一次性）
  - `getLatestPhoneNavigate(): NavigateRequest | null`

状态必须放在 **global slot**（与 apps 相同原因：多模块实例）。

- [ ] **Step 1: 测试**

覆盖：publish 后 subscribe 收到；后到的 publish 覆盖 pending；subscribe 时若有 pending 立即回放最新一条；`waitForPhoneClosed` 在 `emitPhoneClosed` 后 resolve；多次 waiter 一并唤醒。

- [ ] **Step 2: RED → 实现 → GREEN → Commit**

```powershell
git commit -m "feat(phone-sdk): 添加手机导航与关闭等待总线"
```

---

### Task 3: 宿主 `PhoneNavigationController` 实现

**Files:**
- Create: `phone-sdk/src/host/phone/runtime/phone-navigation.ts`
- Modify: `phone-sdk/src/host/phone/runtime/install-host.ts` 或 `phone-extension.tsx` `onRegister`
- Modify: `phone-sdk/src/host/phone/extension/phone-extension.tsx`（导出/绑定 ctx、closePhone 调 `emitPhoneClosed`）

**Interfaces:**
- Consumes: Task 1–2；`activatePhoneRuntime` / `getPhoneRuntime` / `hidePhoneUi` / `ctx.ui.show`
- Produces: `bindPhoneNavigationController(ctx: ExtensionContext): void`  
  写入 `getPhoneSdkSlot().navigation`

**关键约束（跨扩展）：**

聊天方法的 `ctx` **不是**手机扩展的 context，不能用聊天 ctx 去 `ui.show("phone")`。  
必须在 `PhoneExtension.onRegister(ctx)`（及必要时 `onInit`/打开动作）调用 `bindPhoneNavigationController(ctx)`，用**手机** ctx 实现控制器。

- [ ] **Step 1: 实现 `createPhoneNavigationController(ctx)`**

伪代码：

```ts
async openPhoneApp(options) {
  const runtime = getPhoneRuntime(ctx);
  if (runtime.storyMessageSessionVisible) {
    console.warn("[phone] openPhoneApp: 消息手机占用中，已跳过");
    return;
  }
  activatePhoneRuntime(runtime); // 保持挂载语义
  if (!ctx.ui.isVisible("phone")) {
    await ctx.ui.show("phone", undefined, {
      size: "(100%, 100%)",
      position: "(0, 0)",
      interactable: false,
    });
  }
  publishPhoneNavigate({
    appId: options.appId,
    payload: options.payload,
    seq: ++seq,
  });
  if (options.waitUntil === "none") return;
  await waitForPhoneClosed();
}
```

- [ ] **Step 2: `onRegister` 绑定；`closePhone` 在 hide 后 `emitPhoneClosed()`**

注意：`closePhone` 现有逻辑已 `this.close()` + `hidePhoneUi`；在二者之后调用 `emitPhoneClosed()`。若 UI 从未打开就 wait close，也应在 hide no-op 后能被超时或立即策略保护——若 show 失败，`waitUntil:"close"` 应在短超时（如 8s）后 resolve + warn，避免永久挂起。

- [ ] **Step 3: `pnpm build` 通过；Commit**

```powershell
git commit -m "feat(phone-sdk): 实现宿主 openPhoneApp 导航控制器"
```

---

### Task 4: UI 订阅 navigate 并深开内页

**Files:**
- Modify: `phone-sdk/src/host/phone/ui/phone-ui-content.tsx`

**Interfaces:**
- Consumes: `subscribePhoneNavigate`、`lookupPhoneSdkApp`、现有进入内页状态机（`setActiveInPhoneAppId` / `setInAppPhase` 等）
- Produces: 收到请求后打开对应 `appId`（无桌面图标也可）

- [ ] **Step 1: 抽取 `openInPhoneAppById(phoneAppId: string): void`**

从现有 `launchApp` 的 `in-phone-app` 分支抽出共享逻辑（安全区、origin、phase、activeId）。未注册 → `showMessage` warn，不崩溃。

- [ ] **Step 2: `useEffect` 订阅 navigate**

```ts
useEffect(() => {
  return subscribePhoneNavigate((req) => {
    if (messageMode || closing) return;
    openInPhoneAppById(req.appId);
    // payload 暂存到 ref，供内页后续读（可选；chat 可用 slot 旁路）
  });
}, [/* 稳定 deps */]);
```

挂载时消费 `getLatestPhoneNavigate()`。

- [ ] **Step 3: 构建验证 + Commit**

```powershell
pnpm build
git commit -m "feat(phone-sdk): UI 订阅 openPhoneApp 导航请求"
```

---

### Task 5: 版本 0.5.0 与宿主仓文档

**Files:**
- Modify: `phone-sdk/package.json` → `0.5.0`
- Modify: `package.json` / CLI `inkZenly.phoneSdkVersion`（若有钉死 0.4.x 则改为 `^0.5.0`）
- Modify: `src/README.md`（`openPhoneApp` 短例）
- 可选：根 `README.md` 一句指向

- [ ] **Step 1: 改版本与文档示例**

```ts
import { openPhoneApp } from "@ink-zenly/phone-sdk/plugin";

await openPhoneApp({ appId: "chat", waitUntil: "close" });
```

- [ ] **Step 2: Commit**

```powershell
git commit -m "release: phone-sdk 0.5.0 导出 openPhoneApp"
```

---

### Task 6: 聊天扩展接入（`app-015abe`）

**Files:**
- Modify: `app-015abe/package.json`（`@ink-zenly/phone-sdk`: `^0.5.0` 或 `file:` 联调路径）
- Modify: `app-015abe/src/index.tsx`（方法 schema + execute 编排）
- Modify: `app-015abe/src/runtime/actions.ts`（或新建 `open-phone.ts`）
- Modify: `app-015abe/src/constants.ts`（`PROGRAM_ID` 已是 `chat`）
- 可选：README

**Interfaces:**
- Consumes: `openPhoneApp` from plugin
- Produces: 方法参数 `openPhone` / `waitUntilClose`

- [ ] **Step 1: `send-friend-messages`**

`run` 在 `sendFriendMessages` 成功后：

```ts
if (params.openPhone !== false) {
  await openPhoneApp({
    appId: PROGRAM_ID, // "chat"
    waitUntil: params.waitUntilClose === false ? "none" : "close",
    payload: { friendCharacterId: friendId },
  });
}
```

`runImmediately` / `skip`：**不**调用。

Schema 增加：

```ts
openPhone: { type: "boolean", label: "打开手机并进入聊天", default: true },
waitUntilClose: { type: "boolean", label: "等待玩家关闭手机", default: true },
```

- [ ] **Step 2: `await-player-reply`**

`run`：写 pending 后 `openPhoneApp({ appId: PROGRAM_ID, waitUntil: "none", payload: { friendCharacterId } })`（若 `openPhone !== false`），再进入现有 reply wait。  
仅 schema 增加 `openPhone`（不展示 `waitUntilClose`）。

- [ ] **Step 3: 深链（尽量）**

若 `payload.friendCharacterId` 可达：在 `ChatApp` / bus 上 `openFriendThread(id)`；否则打开列表即可。

- [ ] **Step 4: 安装依赖、构建聊天包、Commit（在 app-015abe 仓）**

```powershell
cd C:\Users\20231\Documents\AVG-Extensions\app-015abe
pnpm install
pnpm build
git add ...
git commit -m "feat(chat): 对方发消息/等待回复时自动打开手机"
```

---

### Task 7: 手工验收清单（实现者执行并记入 report）

- [ ] 剧本：`挂载手机` → `对方发送消息`（默认）→ 手机弹出并进 chat；关闭后剧情继续；ArrowUp 仍可开。  
- [ ] `openPhone=false`：只写档不弹。  
- [ ] `waitUntilClose=false`：弹出后剧情立刻继续。  
- [ ] 未先挂载：方法仍弹出，关闭后 ArrowUp 可用。  
- [ ] 快进：不弹窗、存档有消息。  
- [ ] `等待玩家回复`：弹出 chat 且挂起至点选。  
- [ ] 与 `show-message` 交错：消息手机占用时 openPhoneApp 不抢占、剧情不卡死。

---

## Spec Coverage Checklist

| 规格项 | 任务 |
| --- | --- |
| `openPhoneApp` API | Task 1 |
| 导航/关闭总线 | Task 2 |
| 自动挂载 + show + wait | Task 3 |
| UI 深开 | Task 4 |
| 版本 0.5.0 / 文档 | Task 5 |
| 聊天两方法 + 参数 | Task 6 |
| 快进不弹 / 消息不抢占 | Task 3, 6, 7 |
| payload 深链 | Task 6（尽力） |

---

## Manual note for agents

联调时宿主仓 `phone-sdk` 为 `file:phone-sdk`；聊天包可临时：

```json
"@ink-zenly/phone-sdk": "file:../ext-7a9373/phone-sdk"
```

发布后再改回 `^0.5.0`。
