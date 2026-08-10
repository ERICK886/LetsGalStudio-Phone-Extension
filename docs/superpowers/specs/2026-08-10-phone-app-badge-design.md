<!--
  @file 2026-08-10-phone-app-badge-design.md
  @description 手机桌面 APP 红点 / 数字角标：phone-sdk API + 聊天内页接入
  @author 池水三两升
  @date 2026-08-10
  @version 1.0.0
-->

# 手机桌面 APP 角标（红点 / 数字）

## 背景

桌面图标由宿主 catalog 渲染；内页通过 `registerPhoneApp` 注册。两者无状态通道，聊天会话未读（`unreadCount`）无法显示在桌面图标上。

## 目标

1. 在 **phone-sdk** 提供通用桌面角标 API，供任意内页使用。  
2. 支持两种展示：**仅红点** / **数字角标**（内页自选）。  
3. **打开该 APP 内页时自动清除**桌面角标；内页仍可主动 `set` / `clear`。  
4. **聊天内页**在有新消息未读时上报**总未读条数**。  
5. 本期角标状态 **仅内存**，不写宿主存档。

## 非目标

- 角标写入 shared / slot 存档（后续可加）  
- 系统推送、Toast 与角标联动  
- 相册等其它内页的业务接入（API 通用，本期只接聊天）  
- 修改 catalog 作者设置（不新增「角标」配置项）

## 决策摘要

| 项 | 选择 |
| --- | --- |
| 形态 | **C**：`dot` 或 `count`，内页选择 |
| 清除 | **D**：打开 APP 自动清 + 保留主动 API |
| 持久化 | **A**：仅内存 |
| 打开后仍有未读 | 允许内页立刻再 `set` 回数字（推荐） |
| 架构 | Plugin 上报 + 宿主桌面订阅（全局槽位总线） |

---

## 1. Plugin API

包：`@ink-zenly/phone-sdk/plugin`（与 `openPhoneApp` 同层导出）。

### 类型

```ts
/** 桌面 APP 角标（仅内存）。 */
export type PhoneAppBadge =
  | { mode: "dot" }
  | { mode: "count"; count: number };

export type PhoneAppBadgeMap = ReadonlyMap<string, PhoneAppBadge>;
```

### 函数

| API | 行为 |
| --- | --- |
| `setPhoneAppBadge(appId, badge)` | 写入/覆盖；`badge` 为 `null` 等同 clear。`count` 非有限数或 `< 1` 时视为 clear。`count` 展示层上限 `99+`（存储可保留真实 count）。 |
| `clearPhoneAppBadge(appId)` | 删除该 appId 角标。 |
| `getPhoneAppBadge(appId)` | 读当前值；无则 `null`。 |
| `getPhoneAppBadges()` | 返回当前只读快照 Map（或 Record）。 |
| `subscribePhoneAppBadges(listener)` | 任意 set/clear 后通知；返回 unsubscribe。 |

### 校验

- `appId` 经现有 `isPhoneAppId` / `toPhoneAppId` 规范化；非法则 warn 并忽略。  
- 不要求该 id 已 `registerPhoneApp`（桌面可能先有 catalog 图标）；未安装图标时 set 无害，有图标时才可见。

### 存储

- 挂在现有 `globalThis.__LetsGalPhoneSdk__` 槽位（或同级子字段 `badges`），避免多 bundle 实例分裂。  
- **不**写入 `preferences` / `appAvailability` / 任何 saveSchema。

---

## 2. 宿主桌面 UI

### 挂载点

- 文件：`phone-sdk/src/host/phone/ui/phone-ui-content.tsx` + `phone.css`  
- 在 `.phone-app` 内、包住 `.phone-app-icon` 的**相对定位容器**上叠角标（**不要**放进 `overflow: hidden` 的 icon 内部）。

### 视觉

| mode | UI |
| --- | --- |
| `dot` | 右上角小红点（无数字） |
| `count` | 红底白字；`1…99` 显示数字；`>99` 显示 `99+` |

- 禁用（发灰）的 APP：仍显示角标（若有）。  
- 无角标条目时不渲染节点。

### 订阅

- 桌面组件 `useEffect` 订阅 `subscribePhoneAppBadges`，变更时强制重绘。  
- 读取时用 catalog 解析出的 `app.phoneAppId`（或等价字段）查 `getPhoneAppBadge`。

### 自动清除（策略 D）

- 在成功 `openInPhoneAppById(appId)`（或等价打开内页路径）时调用 `clearPhoneAppBadge(appId)`。  
- 剧情消息模式占用手机、未能打开内页时：**不**清角标。  
- 仅 `closeApp` 回桌面：**不清**（若内页未再 set，保持已 clear 状态）。

### 打开后再 set

- 自动 clear 之后，内页可在 `render` / 会话逻辑里根据真实未读再次 `setPhoneAppBadge`。  
- 这样「打开即清」不挡住「仍有未读要显示」。

---

## 3. 聊天内页（`app-015abe`）

### 总数

```ts
const total = threads.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0);
```

### 同步规则

| 时机 | 行为 |
| --- | --- |
| 对方消息写入且 bump 未读后 | `syncChatDesktopBadge()` |
| 打开会话 `clearThreadUnread` 后 | 同上 |
| 扩展 `onRegister` / 存档绑定后首次 | 同上（Preview 重载后可恢复桌面数字，因未读在 chat save） |
| `total > 0` | `setPhoneAppBadge("chat", { mode: "count", count: total })` |
| `total === 0` | `clearPhoneAppBadge("chat")` |

- 本期聊天固定用 **`count` 模式**（不用纯红点）；其它 APP 仍可选 `dot`。  
- `PROGRAM_ID === "chat"`。

### 实现建议

- `runtime/badge.ts`（或 `sync-desktop-badge.ts`）：读 `readChatState().threads` → set/clear。  
- 在 `actions.ts` 变更未读的路径末尾调用；UI 打开会话清未读处也调用。

---

## 4. 版本与文档

- phone-sdk：建议 bump **0.5.4**（patch，新增 API）。  
- 宿主扩展：文档提及角标 API；changelog 记一笔。  
- 聊天 README：说明桌面角标依赖 phone-sdk ≥ 0.5.4。

---

## 5. 测试要点

1. `setPhoneAppBadge("chat", { mode: "dot" })` → 桌面红点。  
2. `set(..., { mode: "count", count: 3 })` → 显示 `3`；`100` → `99+`。  
3. `clear` / `count: 0` → 角标消失。  
4. 打开 chat 内页 → 角标自动消失；若仍有未读且聊天同步逻辑跑过 → 可再出现。  
5. 未注册桌面图标的 id 调用 set → 不抛错。  
6. 单元测试：badge store 的 set/clear/subscribe；非法 appId / count。

---

## 6. 实现顺序（供计划引用）

1. phone-sdk：badge 类型 + 槽位 store + plugin 导出 + 单测  
2. 宿主 UI：角标样式 + 订阅渲染 + 打开内页 clear  
3. 发布 / 对齐 chat 依赖 phone-sdk 版本  
4. app-015abe：未读汇总同步桌面角标  
5. 文档与 changelog

---

## Spec 自检

- [x] 无 TBD / 占位未决（打开后再 set 已确认允许）  
- [x] 与「仅内存 / 双模式 / 打开清 + 主动 API」决策一致  
- [x] 范围：sdk + 聊天；不含相册业务、不含存档持久化  
- [x] 角标挂载避开 icon `overflow: hidden`  
