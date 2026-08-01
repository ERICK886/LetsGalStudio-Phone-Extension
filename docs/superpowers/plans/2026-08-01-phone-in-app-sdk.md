# Phone In-App SDK Implementation Plan

> **For agentic workers:** Execute task-by-task. Commits only when the user explicitly asks.

**Goal:** 落地 `@ink-zenly/phone-sdk`，并让手机扩展支持「手机内部应用」动作（内页渲染 + Home 回桌面）。

**Architecture:** Phone SDK 通过 `globalThis.__LetsGalPhoneSdk__` 排队/注册；手机扩展安装宿主并渲染 `render`；设置新增 `inPhoneAppActions`。

**Tech Stack:** TypeScript、React 18、Vite ESM、现有 `@avg-studio/sdk`。

## Global Constraints

- 无应用顶栏；Home 由手机扩展提供；应用内返回由第三方实现
- `react` / phone-sdk external，禁止 eval
- 中文注释与文件头按项目用户规则

## File Map

| Path | Role |
|------|------|
| `phone-sdk/**` | 新 SDK 包 |
| `src/phone/sdk-host/install-phone-sdk-host.ts` | 宿主实现 |
| `src/phone/core/catalog.ts` | `in-phone-app` 目标 |
| `src/phone/extension/phone-extension.tsx` | 设置 + onRegister 装宿主 |
| `src/phone/ui/phone-ui.tsx` | 内页 + Home |
| `src/phone/ui/components/in-phone-app-boundary.tsx` | 内页错误边界 |
| `src/phone/styles/phone.css` | 内页/Home 样式 |
| `package.json` / `tsconfig.json` / `vite.config.ts` | 依赖与路径 |

### Task 1: Phone SDK 包

- Create: `phone-sdk/package.json`, `phone-sdk/src/{types,slot,register,host,index}.ts`, `phone-sdk/README.md`
- Verify: `tsc` 能解析 `@ink-zenly/phone-sdk`（经 paths）

### Task 2: 宿主安装

- Create: `src/phone/sdk-host/install-phone-sdk-host.ts`
- Modify: `phone-extension.tsx` `onRegister` 调用 `installPhoneSdkHost()`
- Modify: `catalogFromPhoneSettings` 传入 `inPhoneAppActions`

### Task 3: Catalog + Settings

- Modify: `catalog.ts` 增加 `in-phone-app` 解析/校验/分组
- Modify: settings `inPhoneAppActions` array
- Modify: player editor labels / default target / phoneAppId 字段

### Task 4: Phone UI 内页

- Modify: `launchApp` 对 `in-phone-app` 不关手机
- Add: `activeInPhoneApp` 状态、内容区渲染、Home、Escape
- Create: 内页 ErrorBoundary（回桌面）
- CSS: `.phone-in-app`、可点击 Home

### Task 5: 构建验收

- `npm run build` 成功
- 更新 README 最小接入示例（可选短段落）
