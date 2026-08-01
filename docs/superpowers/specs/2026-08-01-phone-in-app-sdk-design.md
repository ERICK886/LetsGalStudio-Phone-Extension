# 手机内部应用显示与 Phone SDK 设计

> **日期**：2026-08-01  
> **状态**：已实现（2026-08-01）  
> **范围**：手机扩展内页应用 + 仿 Studio 的 `@ink-zenly/phone-sdk`  
> **相关**：`docs/手机UI插件方案.md`、`docs/LetsGal-Studio-扩展开发指南.md`

## 1. 背景与目标

当前手机应用启动会先关闭手机，再通过 `ctx.ui.show` / `visualUI.open` / 系统槽等打开全屏界面，第三方 UI 无法嵌在手机屏幕内。

本设计要达成：

1. 扩展设置新增「手机内部应用」动作：点击后**保持手机打开**，在手机屏幕内显示应用界面。
2. 提供仿 `@avg-studio/sdk` 的 **Phone SDK**，第三方扩展通过 SDK 注册应用；作者在应用目录中绑定「点击后打开哪个已注册应用」。

非目标（MVP）：

- 独立 Studio「桥接扩展」
- 正式 npm 发包流程以外的市场分发细节（可先仓库内 `phone-sdk/` + file 依赖）
- 应用内多级导航 UI（由第三方自己实现）
- 按字符串直接调用任意扩展 `method()`

## 2. 架构

```text
第三方扩展                     Phone SDK                      手机扩展（宿主）
───────────                   ─────────                      ──────────────
onRegister → registerPhoneApp ──► 注册表 / 排队 ──► onRegister 安装宿主并刷入
                                              │
作者设置 inPhoneAppActions.phoneAppId ─────────┤
应用目录 defaultActionId ──────────────────────┤
                                              ▼
玩家点击应用 → 不关手机 → 内页渲染 render() → Home 回桌面
```

| 角色 | 职责 |
|------|------|
| `@ink-zenly/phone-sdk` | 类型、注册/注销 API、与宿主约定槽位；薄客户端 |
| `ink.zenly.ext-7a9373` | 安装宿主、消费注册表、设置表单、内页容器、Home 按钮 |
| 第三方扩展 | 依赖 SDK，在 `onRegister` 注册 `id` + `render` |

与 Studio SDK 的对应：

| Studio | 手机侧 |
|--------|--------|
| `@avg-studio/sdk` | `@ink-zenly/phone-sdk` |
| 引擎实现宿主 | 手机扩展实现 phone-sdk 宿主 |
| 第三方 import SDK 写扩展 | 第三方 import phone-sdk 注册内页应用 |

## 3. Phone SDK API

### 3.1 注册

```ts
import { registerPhoneApp, unregisterPhoneApp } from "@ink-zenly/phone-sdk";

registerPhoneApp({
  id: "shop",           // kebab-case，建议全局唯一
  title: "商店",        // 可选；宿主可不展示顶栏，供调试/无障碍等使用
  description?: string,
  render: (props) => <ShopApp {...props} />,
});
```

### 3.2 `render` props（MVP）

| 字段 | 说明 |
|------|------|
| `appId` | 注册 id |
| `closeApp()` | 返回手机桌面（不关闭手机） |
| `closePhone()` | 关闭整部手机 |

不强制注入 `ExtensionContext`。第三方在组件内使用自己的 `useExtensionContext()`。

应用内部的返回、多级页面由第三方自行实现；需要回桌面时调用 `closeApp()`。

### 3.3 其它 API

- `unregisterPhoneApp(id)`：扩展停用时清理
- `listRegisteredPhoneApps()`：调试用只读列表
- 宿主未就绪：注册入队；手机扩展安装宿主后刷入
- 同 `id` 重复注册：后写覆盖，并 `console.warn`

### 3.4 运行时约定

- 使用固定命名空间宿主槽（例如 `globalThis.__LetsGalPhoneSdk__`），由手机扩展安装实现。
- `react` / `react-dom` / `@avg-studio/sdk` / `@ink-zenly/phone-sdk` 在第三方与手机扩展构建中均 **external**，避免多 React 实例。
- 禁止 `eval`、动态执行作者/玩家任意代码；只渲染已注册的 `render` 函数。

## 4. 手机扩展设置与目标类型

### 4.1 新设置分组

`inPhoneAppActions` — 「动作 · 手机内部应用」：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 动作 ID，供应用目录「默认动作 ID」引用 |
| `name` | string | 显示名 |
| `phoneAppId` | string | 第三方 `registerPhoneApp` 的 `id` |
| `description` | string | 可选说明 |

纳入现有 `catalogFromSettingsRows` 分组合并逻辑（与 `programUiActions` 等并列）。

### 4.2 目标判别联合新增

```ts
| { kind: "in-phone-app"; phoneAppId: string }
```

校验：`phoneAppId` 须符合安全 id（小写字母、数字、连字符，长度受限）。

### 4.3 作者配置流程

1. 第三方用 SDK 注册例如 `shop`
2. 手机设置添加内部应用动作，`phoneAppId = shop`
3. 应用目录某图标的「默认动作 ID」填该动作 `id`

## 5. 内页 UI 与交互

### 5.1 布局

- 保留手机外壳与状态栏。
- 桌面区域替换为**全屏应用内容区**（无应用顶栏、无宿主提供的「← 返回」条）。
- 手机扩展提供 **Home 按钮**：仅「回桌面」，不关手机。可基于现有底部 `phone-home-indicator` 区域做成可点击控件（内页可见；桌面模式下可保持装饰或隐藏点击语义）。
- 应用内导航完全由第三方负责。

### 5.2 启动与关闭

| 目标类型 | 行为 |
|----------|------|
| `in-phone-app` | **不**调用 `closeWithAnimation`；设置 `activeInPhoneApp`；渲染注册组件 |
| 其它现有类型 | 保持现状：先关手机再执行 `launchPhoneTarget` |

| 输入 | 行为 |
|------|------|
| Home | 内页 → 桌面；清 `activeInPhoneApp` |
| Escape | 内页 → 桌面；桌面 → 关手机 |
| 遮罩 / 右上角 × | 关手机并清内页状态 |
| `closeApp()` | 同 Home |
| `closePhone()` | 同关手机 |

### 5.3 生命周期

| 时机 | 行为 |
|------|------|
| 手机 `onRegister` | 安装 SDK 宿主；刷入排队注册 |
| 第三方 `onRegister` | `registerPhoneApp`（可早于或晚于宿主） |
| 打开内页 | 挂载 `render` |
| Home / 关手机 / `onClose` | 卸载内页，清空状态 |
| 读档、切章、软重置 | 走现有关手机清理，并丢掉内页状态 |
| 同 id 热更新 | MVP 不热替换已打开实例；下次进入用新组件 |

### 5.4 错误处理

| 情况 | 表现 |
|------|------|
| 未注册 / 宿主未装 | Toast「应用不可用」，留在桌面 |
| `render` 抛错 | 内页 ErrorBoundary + 可回桌面，不白屏整机 |
| 非法 `phoneAppId` | 解析阶段丢弃动作并打日志 |

## 6. 建议源码布局

```text
phone-sdk/                      # 独立包，仿 sdk/ 结构
├── package.json                # name: @ink-zenly/phone-sdk
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── register.ts             # 排队 + 调宿主
│   └── host.ts                 # 宿主接口类型（供手机扩展实现）
└── README.md

src/phone/
├── sdk-host/                   # 手机扩展内的宿主实现
│   └── install-phone-sdk-host.ts
├── core/catalog.ts             # 增加 in-phone-app
├── extension/phone-extension.tsx  # inPhoneAppActions 设置
└── ui/phone-ui.tsx             # 内页容器 + Home
```

构建：手机扩展可将 `@ink-zenly/phone-sdk` 标为 external 或 workspace 依赖；第三方扩展同理。

## 7. 验收标准

- [ ] 设置中可配置「动作 · 手机内部应用」并绑定到应用图标
- [ ] 点击后手机不关闭，屏幕内显示第三方界面
- [ ] Home 回桌面；Escape 在内页回桌面、在桌面关手机
- [ ] 无宿主顶栏；应用内返回由第三方自己写
- [ ] 未注册 id 有明确 Toast，不中断剧本
- [ ] 第三方组件崩溃被内页边界接住
- [ ] 现有 program-ui / visual-ui / system-slot / local-command 行为不变

## 8. 实施顺序（写入 plan 时用）

1. 落地 `phone-sdk` 包（类型 + 注册/排队 + 宿主接口）
2. 手机扩展安装宿主
3. `PhoneTarget` / catalog / settings 增加 `in-phone-app`
4. `phone-ui`：内页状态机、内容区、Home、Escape、ErrorBoundary
5. 示例第三方或文档中的最小注册样例
6. 构建与手动验收清单

## 9. 已确认决策记录

- 交互：手机保持打开，桌面切到应用内页（非全屏遮罩层方案优先）
- 接入：自研 Phone SDK（仿 Studio SDK），不做独立桥接 Studio 扩展
- UI：无应用顶栏；Home 由手机扩展提供；应用内返回由第三方实现
