# openPhoneApp：剧情自动打开手机并进入内页

> **日期**：2026-08-09  
> **状态**：待审阅  
> **范围**：`@ink-zenly/phone-sdk/plugin` 新增导航 API；手机宿主实现；聊天扩展 `app-015abe` 默认接入  
> **非目标**：改写 `show-message` 消息手机；强制桌面图标配置；独立于宿主的第二套手机壳

## 1. 背景与目标

Fragment 方法（如聊天「对方发送消息」）当前只写存档，玩家看不到手机内页。需要：

1. 方法执行时**自动弹出手机**并**进入对应内页 App**（如 `chat`）。  
2. 能力沉淀为 **SDK API**，供 chat / album 等内页扩展复用。  
3. 可配置「等关闭 / 立即继续」；未挂载时自动挂载并在关闭后保持挂载。

## 2. 已确认决策

| 项 | 定案 |
| --- | --- |
| 架构 | 方案 A：`phone-sdk/plugin` 提供 `openPhoneApp` |
| 等待语义 | 可配置 `waitUntil: "close" \| "none"`，默认 `"close"` |
| 未挂载 | 自动挂载；关闭后**保持挂载** |
| 聊天默认接入 | `send-friend-messages` + `await-player-reply`；增删好友不默认打开 |
| 快进 / skip | 不弹 UI |
| 消息手机占用 | 不抢占，避免卡死 |

## 3. SDK API（`@ink-zenly/phone-sdk/plugin`）

```ts
type OpenPhoneAppWaitUntil = "close" | "none";

interface OpenPhoneAppOptions {
  /** 与 registerPhoneApp / phoneAppId 一致，如 "chat" */
  appId: string;
  /**
   * close：等玩家关闭手机（默认）
   * none：弹出并导航后立刻 resolve
   */
  waitUntil?: OpenPhoneAppWaitUntil;
}

function openPhoneApp(options: OpenPhoneAppOptions): Promise<void>;
```

### 3.1 行为表

| 情况 | 行为 |
| --- | --- |
| 未挂载 | 自动 mount；关闭后保持挂载 |
| UI 未显示 | `ctx.ui.show("phone", …, { interactable: false })` |
| 已在目标 App | 置前/刷新；`waitUntil:"close"` 仍等下次关闭 |
| 在桌面或其他 App | 切换到目标 `appId` |
| `appId` 未注册 | 仍尝试打开手机；`console.warn`；不抛死剧情 |
| 快进路径 | 调用方不弹 UI（见 §5）；若仍调用且 `close`，立即 resolve |
| `show-message` 占用中 | 不抢占；warn 并立即 resolve（`close`/`none` 皆然） |

### 3.2 宿主接口扩展

在 `PhoneSdkHost`（或并列的导航控制器，经同一 `globalThis` 槽位暴露）增加：

- `openPhoneApp(options): Promise<void>` — 由宿主实现  
- 内部：`ensureMounted` → `showPhoneUi` → `publishNavigate(appId)` → 可选等待 `phone-closed`

Plugin 侧 `openPhoneApp`：若宿主未安装则 `console.warn` + resolve（或 reject 由实现选定；**推荐 warn + resolve**，避免独立内页包在无宿主时卡死剧情）。

## 4. 宿主实现

```text
openPhoneApp({ appId, waitUntil })
        │
        ▼
┌─────────────────────────────┐
│ 1. ensureMounted()          │
│ 2. showPhoneUi()            │  已显示则跳过
│ 3. publishNavigate(appId)   │  全局 slot / bus
│ 4. waitUntil === "close"    │  等 closePhone 完成
│    waitUntil === "none"     │  派发后立即 resolve
└─────────────────────────────┘
```

### 4.1 UI（`phone-ui-content`）

- 订阅 navigate 请求：命中 `registerPhoneApp` 则走与桌面启动相同的 in-phone-app 进入逻辑（**不依赖桌面图标是否配置**）。  
- 请求可在 UI 未挂载时入队；`useEffect` 挂载后消费**最新一条**。  
- `closePhone`（含点外部关闭）在 `hide` 成功后 `emitPhoneClosed()`，唤醒 `waitUntil:"close"` 等待者。

### 4.2 与现有能力

| 能力 | 关系 |
| --- | --- |
| ArrowUp | 不变（仍要求已挂载；本 API 会先保证挂载） |
| 桌面点图标 | 不变 |
| `show-message` | 占用时本 API 不抢占 |
| 点外部关闭 | 走现有 close → hide，并唤醒 waiters |

## 5. 聊天扩展接入（`app-015abe`）

### 5.1 默认接入

| 方法 | `run` | `runImmediately` / `skip` |
| --- | --- | --- |
| `send-friend-messages` | 写档 → `openPhoneApp` | 只写档 |
| `await-player-reply` | 写档 → 开手机（见下）→ 等点选 | 只写档 + 自动点选 |
| `add-friend` / `remove-friend` | 不自动打开 | 同左 |

### 5.2 方法参数

| 字段 | 类型 | 默认 | 含义 |
| --- | --- | --- | --- |
| `openPhone` | boolean | `true` | 是否调用 `openPhoneApp` |
| `waitUntilClose` | boolean | `true` | 仅对「对方发送消息」生效 |

### 5.3 等待语义（避免双重挂起）

- **`send-friend-messages`**：`waitUntilClose === true` → `waitUntil: "close"`；否则 `"none"`。  
- **`await-player-reply`**：打开时固定 `waitUntil: "none"`（保证弹出）；剧情挂起仍只靠玩家点选回复。`waitUntilClose` 对该方法忽略（可不展示或展示但无效果，推荐不展示以免误解）。

### 5.4 编排（等待回复）

```text
1. bindSave + 写入 pending 回复
2. openPhoneApp({ appId: "chat", waitUntil: "none" })（若 openPhone）
3. 挂起至内页点选（现有 reply-wait）
4. 写 outgoing + effects → resolve 方法
```

### 5.5 深链（建议第一版尽量做）

打开 chat 时若带有 `friendCharacterId`，经 chat bus 尽量进入该好友会话；做不到则打开 chat 列表亦可接受。

可选扩展 `OpenPhoneAppOptions`：

```ts
/** 内页私有载荷；宿主原样转发给目标 App（第一版 chat 可读 friendId） */
payload?: Record<string, unknown>;
```

第一版宿主只保证打开 `appId`；payload 经 bus 旁路给 chat（若实现成本低则一并做）。

## 6. 版本与文档

- `@ink-zenly/phone-sdk` 升 patch/minor（建议 **0.5.0** 若视 API 为新能力；或 **0.4.9** 若紧贴 0.4.8 热修线——**推荐 0.5.0**）。  
- `app-015abe` 依赖升到对应 phone-sdk；README / `src/README.md` 补充 `openPhoneApp` 示例。  
- 作者向：说明聊天两方法新参数默认行为。

## 7. 测试建议

- 宿主：未挂载 → open → 已挂载且 UI 显示且 activeAppId 正确；close 唤醒 waiter。  
- `waitUntil:"none"` 在 show 派发后立即 resolve。  
- 消息手机占用时不抢占。  
- 聊天：send 默认会开手机；`openPhone:false` 只写档；快进不弹。

## 8. 非目标

- 不替代 `show-message` 气泡会话。  
- 不要求桌面「手机应用目录」预先配置该 App（深开走注册表）。  
- 第一版不实现「等退出内页但保持手机打开」的 waitUntil 值（仅 `close` / `none`）。
