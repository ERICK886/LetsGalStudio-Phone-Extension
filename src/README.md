# 内页插件与宿主开发指南

> 面向开发者：在本仓或脚手架工程中开发手机内页、使用 CLI / phone-sdk。  
> 作者侧「如何使用手机」（挂载、设置、消息、Toast）见根目录 [README.md](../README.md)。  
> 当前推荐：`@ink-zenly/phone-sdk@^0.4.7` ｜ `@ink-zenly/create-phone-app@0.3.3` ｜ Studio SDK `>=1.9.0`

本目录 `src/` 是本仓宿主扩展的入口与内页应用（如 `demo-shop/`）。宿主实现在 `@ink-zenly/phone-sdk`，脚手架在 `cli/`。

## 目录

0. [快速导航](#0-快速导航)
1. [源码结构](#1-源码结构)
2. [内页应用完整开发流程](#2-内页应用完整开发流程)
3. [脚手架 create-phone-app 详解](#3-脚手架-create-phone-app-详解)
4. [宿主扩展包 id 注入（phone-sdk ≥ 0.4.0）](#4-宿主扩展包-id-注入phone-sdk--040)
5. [phone-sdk 包说明与 API 要点](#5-phone-sdk-包说明与-api-要点)
6. [版本更新日志](#6-版本更新日志)

## 0. 快速导航

| 目标 | 路径 |
|------|------|
| 在本仓加内页 | `pnpm create-phone-app add <app-id>` → [§2.3](#23-路径-a在本仓库开发内页推荐入门) |
| 从零新建宿主 | `pnpm dlx @ink-zenly/create-phone-app@0.3.3 create …` → [§2.4](#24-路径-b从零创建宿主--内页) / [§3](#3-脚手架-create-phone-app-详解) |
| 分发标准内页包 | `pnpm create-phone-app pack <app-id>` → [§2.3 步骤 6](#步骤-6可选pack-成标准内页包) |
| SDK 双入口与依赖 | [§5](#5-phone-sdk-包说明与-api-要点) |
| 版本变更 | [§6](#6-版本更新日志) |

### 三层 ID

| 层级 | 含义 | 本仓示例 |
|------|------|----------|
| **宿主扩展包 id** | `extension.json.id`；打开手机动作为 `<id>.open-phone` | `ink.zenly.ext-7a9373` |
| **内页程序 id（app-id）** | `registerPhoneApp({ id })`；作者设置 `phoneAppId` | `demo-shop` |
| **宿主模块 id** | SDK 固定 | `phone` / `phone-toast` |

宿主扩展包 id **≠** 内页 app-id。

### 推荐版本

```text
LetsGal Studio SDK          >= 1.9.0
本仓扩展 / 自建宿主          1.1.0+
@ink-zenly/phone-sdk        ^0.4.7
@ink-zenly/create-phone-app 0.3.3
```

本仓联调可用 `"@ink-zenly/phone-sdk": "file:phone-sdk"`。

### 构建与重载（开发）

```powershell
# 仓库根目录
pnpm install
pnpm run watch   # 或 pnpm run build
```

改 schema / TS / CSS 后：构建 → Studio 重载扩展 → 必要时重启 Preview。不要修改 `sdk/`。  
根目录 `vite.config.ts` 会注入 `__PHONE_HOST_EXTENSION_ID__`（见 [§4](#4-宿主扩展包-id-注入phone-sdk--040)）。

## 1. 源码结构
```text
extension.json                 # 扩展清单（id / entry / sdkVersion）
vite.config.ts                 # 构建；注入 __PHONE_HOST_EXTENSION_ID__
src/
├─ index.tsx                   # 扩展入口：导出 Phone/Toast，bootstrap 内页清单
├─ vite-env.d.ts
└─ <app-id>/                   # 内页应用（如 demo-shop/）：registerPhoneApp + UI
phone-sdk/                     # 发布包 @ink-zenly/phone-sdk（0.4.0+）
├─ src/index.ts                # main：宿主 PhoneExtension / ToastExtension
├─ src/client/                 # → @ink-zenly/phone-sdk/plugin（内页 API）
└─ src/host/
   ├─ host-extension-id.ts     # 宿主扩展包 id：Vite 注入优先，否则默认回退
   ├─ phone/                   # 目录、扩展、UI、CSS
   ├─ toast/
   └── studio/                 # 编辑器内联卡片等
cli/                           # 发布包 @ink-zenly/create-phone-app（0.3.3+）
sdk/                           # 本项目使用的 Studio SDK；不要直接修改
```

三层 ID 勿混淆：

| 层级 | 来源 | 本仓 / 脚手架示例 | 是否由用户自定义 |
|------|------|-------------------|------------------|
| **宿主扩展包 id** | 宿主 `extension.json` → `id` | 本仓 `ink.zenly.ext-7a9373`；脚手架 = `--extension-id` | 是（脚手架必填，互不从 app-id 推导） |
| **内页程序 id（app-id）** | `registerPhoneApp({ id })` / `src/<app-id>/` | `demo-shop` | 是（`--app-id` / `add`） |
| **宿主模块 id** | `@extension({ id })` | `phone` / `phone-toast` | 否（SDK 固定） |

## 2. 内页应用完整开发流程

「内页应用」指在**手机屏幕内部**打开的 UI：点击桌面 APP 后不关闭手机，底部 Home / Escape 回到桌面。  
实现依赖 `@ink-zenly/phone-sdk/plugin`；运行时必须同时存在**手机宿主**（`PhoneExtension`）。

API 细节见 [`../phone-sdk/README.md`](../phone-sdk/README.md)；CLI 细节见 [`../cli/README.md`](../cli/README.md)。

### 2.1 先弄清三条路径

| 路径 | 适用 | 产物 |
|------|------|------|
| **A. 本仓库宿主内开发** | 跟本扩展一起联调、示例（如 `demo-shop`） | 打进本仓 `dist/index.mjs`；也可用 `pack` 再拆分发 |
| **B. 新建独立宿主再开发** | 新项目从零搭手机 + 内页 | `create` 生成宿主工程；内页在 `src/<app-id>/` |
| **C. 分发标准内页包** | 给别人只装「某个 APP」，对方已有宿主 | `pack` → `release/`，与宿主扩展**同时启用** |

```text
路径 A / B（开发期）
  宿主工程
    ├─ PhoneExtension / ToastExtension   ← phone-sdk main
    ├─ src/index.tsx                     ← bootstrap 注册表
    └─ src/<app-id>/                     ← 内页（plugin API）
         ↓ 可选 pack
路径 C（分发期）
  release/ 标准内页扩展（无宿主）
  + 玩家环境中的手机宿主扩展
```

### 2.2 必须对齐的 ID

脚手架自 **0.3.2** 起：宿主扩展包 id 与内页 app-id **分开指定**，不再生成 `ink.zenly.phone-app-*`。

| 名称 | 规则 | 谁指定 | 示例 |
|------|------|--------|------|
| **宿主扩展包 id** | `^[a-z][a-z0-9.-]*$`（可含点号）→ 宿主 `extension.json.id` | `create --extension-id` | `com.acme.my-phone` |
| **程序 ID / app-id** | `^[a-z][a-z0-9-]*$` → `registerPhoneApp({ id })`、`src/<app-id>/` | `create --app-id` / `add` | `demo-shop`、`my-mail` |
| **phoneAppId（作者设置）** | 填**程序 ID**，或 `宿主扩展包ID/程序ID` | Studio 手动配置 | `my-mail` |
| **动作 ID** | 作者自定；APP 目录「默认动作 ID」引用它 | Studio 手动配置 | `open-my-mail` |
| **内页包扩展包 id**（仅 pack） | 默认同 app-id；可用 `--extension-id` 覆盖 | `pack` 可选 | 默认 `my-mail` |

要点：

- **宿主扩展包 id ≠ 内页 app-id**。打开手机动作为 `<宿主扩展包 id>.open-phone`；桌面点开内页靠 `phoneAppId` = app-id。
- 开发期挂在本仓时，内页**没有**独立 `@extension`；程序 ID 仍必须稳定，将来 `pack` 后应与内页包 `@extension({ id })`（通常等于 app-id）一致。
- 宿主模块 id `phone` / `phone-toast` **不是**内页 app-id，也不要当成扩展包 id。

### 2.3 路径 A：在本仓库开发内页（推荐入门）

#### 步骤 1：生成或复制内页骨架

```powershell
# 在本仓根目录
pnpm create-phone-app add my-mail --title "邮件"
```

效果：

1. 创建 `src/my-mail/index.tsx`、`src/my-mail/app.tsx`
2. 自动改 `src/index.tsx`：增加 `import`，并把 `registerMyMailPhoneApp` 加入 `definePhonePluginRegistry(...)`

也可手写，结构对齐 `src/demo-shop/`：

```text
src/my-mail/
├─ index.tsx    # export PROGRAM_ID + registerXxxPhoneApp()
└─ app.tsx      # React UI，接收 PhoneAppRenderProps
```

注册函数约定：`register` + PascalCase(app-id) + `PhoneApp`  
（`my-mail` → `registerMyMailPhoneApp`）

#### 步骤 2：实现注册与 UI

`index.tsx` 最小形态：

```tsx
import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { MyMailApp } from "./app";

export const PROGRAM_ID = "my-mail";

export function registerMyMailPhoneApp(): void {
  registerPhoneApp({
    id: PROGRAM_ID,
    title: "邮件",
    description: "示例邮件内页",
    render: (props) => <MyMailApp {...props} />,
  });
}
```

`app.tsx` 使用宿主注入的 props（类型 `PhoneAppRenderProps`）：

| prop | 用途 |
|------|------|
| `appId` | 注册时的程序 ID |
| `closeApp` | **回桌面**（不关手机） |
| `closePhone` | 关闭整部手机 UI |
| `safeAreaInsets` | 刘海 / Home 指示条等安全区（px） |

内页路由、返回键、业务状态由你自己实现；宿主只负责「打开 / Home 回桌面 / 错误边界」。

入口侧保持清单注册（本仓现状）：

```tsx
// src/index.tsx
import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerDemoShopPhoneApp } from "./demo-shop";
import { registerMyMailPhoneApp } from "./my-mail";

bootstrapPhonePluginApps(
  definePhonePluginRegistry(
    registerDemoShopPhoneApp,
    registerMyMailPhoneApp,
  ),
);

export { PhoneExtension, ToastExtension } from "@ink-zenly/phone-sdk";
export { default } from "@ink-zenly/phone-sdk";
```

`add` 命令会自动完成上述注入；手写时勿漏掉 `bootstrapPhonePluginApps`。

#### 步骤 3：构建并加载到 Studio

```powershell
pnpm install
pnpm watch
# 或改完后：pnpm build
```

在 Studio 中重载本扩展（入口 `dist/index.mjs`）。内页与宿主打在**同一个**扩展包里。

#### 步骤 4：作者设置——动作 + 桌面 APP（必做）

仅有代码注册**不会**自动出现图标，必须配置：

**4a. 动作 · 手机内部应用**

| 字段 | 示例 |
|------|------|
| ID | `open-my-mail` |
| 名称 | `邮件` |
| phoneAppId | `my-mail`（与 `PROGRAM_ID` **完全一致**） |
| 说明 | 可选 |

**4b. 手机应用目录**

| 字段 | 示例 |
|------|------|
| 应用 ID | `mail-app`（桌面项 ID，可与程序 ID 不同） |
| 应用名称 | `邮件` |
| 默认动作 ID | `open-my-mail`（与 4a 的动作 ID 一致） |
| 游戏开始默认预装 | 开启（开发期建议开） |
| 作者默认可用 | 开启 |

保存后重载扩展 / 重启 Preview。

#### 步骤 5：剧本 Preview 验证

1. 剧情中调用 `mount-phone`（或沿用已有挂载点）。
2. 按打开手机快捷键（默认 `ArrowUp`）。
3. 点击「邮件」：应在手机**屏幕内**打开内页，手机外壳仍在。
4. 点内页「回桌面」或宿主 Home：回到四列桌面，手机不关。
5. Escape / 遮罩：关闭手机（与内页 `closeApp` 不同）。

程序 Preview 只能看宿主 UI 壳，**不会**跑剧情挂载，也不适合验证内页点击链路；请用**剧本 Preview**。

#### 步骤 6（可选）：pack 成标准内页包

开发稳定后，若要单独分发该内页：

```powershell
pnpm create-phone-app pack my-mail --title "邮件"
# 若内页包的 extension.json.id 需要与 app-id 不同：
pnpm create-phone-app pack my-mail --title "邮件" --extension-id com.acme.my-mail-ext
```

- 默认输出到宿主根下 `release/`（已被 `.gitignore`）
- 自动 `pnpm install` + `pnpm build`
- 产物是**只有内页**的扩展：无 `PhoneExtension`，需与手机宿主**同时启用**
- 内页包 `extension.json.id` **默认等于 app-id**；可用 `--extension-id` 单独指定
- 对方宿主里 `phoneAppId` 仍填 **app-id** `my-mail`（或 `宿主扩展包id/my-mail`），不要填错成内页包 extension-id（除非二者相同）

### 2.4 路径 B：从零创建宿主 + 内页

适合不改本仓、单独开工程：

```powershell
pnpm dlx @ink-zenly/create-phone-app@0.3.3 create .\my-host `
  --template default `
  --extension-id com.acme.my-phone `
  --app-id my-shop `
  --title "我的商店"

cd .\my-host
pnpm install
pnpm watch
```

生成物已包含：

- 宿主入口（导出 Phone / Toast）；`extension.json.id` = 你指定的 `--extension-id`
- 首个内页 `src/my-shop/`（`--app-id`，与宿主 id **独立**）
- `vite` 注入 `__PHONE_HOST_EXTENSION_ID__`（见 [§4](#4-宿主扩展包-id-注入phone-sdk--040)）
- 依赖 `@ink-zenly/phone-sdk` 的 npm 版本（当前脚手架写入 `^0.4.6`）与捆绑 `sdk/`

之后在该工程内继续 `add` 更多内页，或改 `src/my-shop/app.tsx`。  
Studio 中启用的是**该宿主扩展**的 `extension.json.id`（例如 `com.acme.my-phone`），不是本仓官方 id。

作者设置步骤与 [§2.3 步骤 4](#步骤-4作者设置动作--桌面-app必做) 相同，仅扩展换成新宿主。

### 2.5 路径 C：第三方独立扩展（手写 `@extension`）

若内页本身是完整 Studio 扩展（带自己的 `extension.json`），可在控制器 `onRegister` 中注册：

```tsx
import { Extension, extension } from "@avg-studio/sdk";
import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";

const PROGRAM_ID = "shop";

@extension({ id: PROGRAM_ID, label: "商店", exposeUI: false })
export class ShopController extends Extension {
  static onRegister() {
    registerPhoneApp({
      id: PROGRAM_ID,
      title: "商店",
      render: ({ closeApp, safeAreaInsets }) => (
        <div style={{ paddingTop: safeAreaInsets.top, color: "#fff" }}>
          <h2>商店</h2>
          <button type="button" onClick={closeApp}>回桌面</button>
        </div>
      ),
    });
  }
}
```

注意：

- `@extension({ id })` **必须**等于 `registerPhoneApp({ id })`
- 构建时将 phone-sdk **打进**内页 bundle；`react` / `@avg-studio/sdk` 保持 external
- 游戏中须**同时启用**手机宿主扩展，并在宿主设置里把 `phoneAppId` 指到该程序 ID

`pack` 产物即按此形态生成，一般无需手写脚手架。

### 2.6 依赖与构建约定

| 角色 | 依赖 |
|------|------|
| 宿主工程 | `@ink-zenly/phone-sdk`（main + 打进 bundle）、`@avg-studio/sdk`（external，本仓/模板为 `file:./sdk`） |
| 内页（plugin） | 只从 `@ink-zenly/phone-sdk/plugin` 引用 API；由宿主或内页包入口打包 |

本仓开发：`package.json` 可用 `"@ink-zenly/phone-sdk": "file:phone-sdk"`。  
脚手架默认写 npm `^0.4.6`（见 CLI `inkZenly.phoneSdkVersion`），不要改成默认 `file:`。

### 2.7 内页开发检查清单

- [ ] 新建宿主时已分别指定 `--extension-id`（宿主包）与 `--app-id`（内页），二者不要混用
- [ ] `app-id` 合法（小写开头，仅 `a-z` / `0-9` / `-`）
- [ ] `registerPhoneApp({ id })` 与作者设置 `phoneAppId` 一致
- [ ] `src/index.tsx`（或独立扩展 `onRegister`）已注册该应用
- [ ] 已配置「动作 · 手机内部应用」+「手机应用目录」且默认动作 ID 互指正确
- [ ] `pnpm build` / `watch` 后已在 Studio 重载扩展
- [ ] 剧本 Preview 中已 `mount-phone`，能打开内页并 Home 回桌面
- [ ] 安全区：`padding` 使用了 `safeAreaInsets`
- [ ] 分发前若只要内页：已 `pack`，且说明需同时启用宿主；`phoneAppId` 指向 app-id

### 2.8 内页常见问题

| 现象 | 优先检查 |
|------|----------|
| 桌面没有图标 | 应用目录是否预装；默认动作 ID 是否有效；是否被剧情删除 |
| 点击无反应 / 打不开内页 | `phoneAppId` 是否与 `PROGRAM_ID` 一致；扩展是否已 build 并重载；是否已 `mount-phone` |
| 打开了却立刻回桌面或白屏 | 看控制台内页错误边界；检查 `render` 是否抛错 |
| 只有程序 Preview 能看见手机壳 | 改用剧本 Preview 验证内页 |
| pack 后对方打不开 | 对方是否启用了**宿主**；`phoneAppId` 是否仍指向同一程序 ID |
| 快捷键打开手机异常 | 宿主扩展包 id 是否已 Vite 注入（§4）；勿与内页 app-id 混淆 |

## 3. 脚手架 create-phone-app 详解

包名：`@ink-zenly/create-phone-app@0.3.3`（[npm](https://www.npmjs.com/package/@ink-zenly/create-phone-app)）。  
源码在仓库 `cli/`；完整选项见 [`../cli/README.md`](../cli/README.md)。内页联调步骤见 [§2](#2-内页应用完整开发流程)。

### 3.1 三条命令各干什么

| 命令 | 场景 | 输入 | 输出 |
|------|------|------|------|
| `create` | 从零搭**手机宿主**扩展 | `--extension-id` + `--app-id`（均必填） | 独立 Vite 工程：宿主 + 首个内页 + 捆绑 `sdk/` |
| `add` | 已有宿主里加内页 | `--app-id`（及可选 `--title`） | `src/<app-id>/` + 自动改 `src/index.tsx` 注册表 |
| `pack` | 把内页拆成可分发扩展 | `app-id`；`--extension-id` 可选 | `release/` 标准内页包（自动 `pnpm install` + `build`） |

不传子命令时进入交互向导（可选手动选 `create` / `add`）。

### 3.2 安装与调用

```powershell
# 本仓（推荐联调脚手架本身）
pnpm create-phone-app --help
pnpm create-phone-app create --help
pnpm create-phone-app add --help
pnpm create-phone-app pack --help

# 无本仓：用已发布包（注意钉版本）
pnpm dlx @ink-zenly/create-phone-app@0.3.3 create .\my-host `
  --template default `
  --extension-id com.acme.my-phone `
  --app-id my-shop `
  --title "我的商店"
```

根 `package.json` 的 `create-phone-app` script 指向 `node ./cli/bin/create-phone-app.js`（本地源码，不必先 `npm i -g`）。

### 3.3 `create`：生成宿主

```powershell
pnpm create-phone-app create .\my-host --template default `
  --extension-id com.acme.my-phone --app-id my-shop --title "我的商店"
pnpm create-phone-app create .\tiny --template minimal `
  --extension-id tiny-host --app-id tiny --title 精简 --force
```

| 选项 | 说明 |
|------|------|
| `[dir]` | 目标目录（可缺省；默认 `./<extension-id>`） |
| `--template` | `default`（完整 README）或 `minimal` |
| `--extension-id` | 宿主扩展包 id：`^[a-z][a-z0-9.-]*$`（可含点号） |
| `--app-id` | 首个内页程序 ID：`^[a-z][a-z0-9-]*$` |
| `--title` | 显示标题 |
| `--force` | 允许写入非空目录 |

生成后：

```powershell
cd <dir>
pnpm install
pnpm watch   # 或 pnpm build
```

在 Studio 中加载该目录的扩展（`extension.json` → `dist/index.mjs`），再按 [§2.3 步骤 4](#步骤-4作者设置动作--桌面-app必做) 配置动作与桌面 APP。

### 3.4 `add`：追加内页

须在**已有宿主根**（存在 `definePhonePluginRegistry` 的 `src/index.tsx`）执行：

```powershell
pnpm create-phone-app add my-mail --title "邮件"
pnpm create-phone-app add notes --title "便签" --force
```

效果：创建 `src/<app-id>/index.tsx` + `app.tsx`，并注入注册函数（命名：`register` + PascalCase(app-id) + `PhoneApp`）。  
`create` / `add` **不会**自动 `pnpm install`；改完请自行 `build` / `watch`。

### 3.5 `pack`：抽离可分发内页包

```powershell
pnpm create-phone-app pack demo-shop
pnpm create-phone-app pack my-mail --title "邮件" --extension-id com.acme.my-mail-ext
pnpm create-phone-app pack my-mail --out ./release --force
```

| 选项 | 说明 |
|------|------|
| `[app-id]` | 程序 ID；交互终端可列出 `src/*/index.tsx` |
| `--out` | 输出目录，默认宿主根下 `release/`（已 gitignore） |
| `--extension-id` | 内页包 `extension.json.id`（**默认 = app-id**） |
| `--title` / `--force` / `--cwd` | 标题、覆盖、查找宿主根的起点 |

产物**不含** `PhoneExtension`：对方环境须同时启用手机宿主；宿主设置里 `phoneAppId` 填 **app-id**，不要误填成内页包 extension-id（除非二者相同）。

### 3.6 app-id 规则与常见坑

- 合法：`^[a-z][a-z0-9-]*$`（如 `demo-shop`、`my-mail`）
- 非法：`Bad_Id`、`123shop`、`MyApp`
- 已提供 app-id 时会在进入交互前校验；非法立即非零退出
- **勿**把宿主 `--extension-id` 填进 `registerPhoneApp({ id })`
- 脚手架**禁止**默认写出 `file:../phone-sdk`；联调时再本地改依赖

### 3.7 命令速查复制区

```powershell
# 本仓
pnpm create-phone-app create .\my-host --template default `
  --extension-id com.acme.my-phone --app-id my-shop --title "我的商店"
pnpm create-phone-app add my-mail --title "邮件"
pnpm create-phone-app pack my-mail --title "邮件"
pnpm create-phone-app pack my-mail --extension-id com.acme.my-mail-ext --title "邮件"

# 已发布包
pnpm dlx @ink-zenly/create-phone-app@0.3.3 create .\my-host --template minimal `
  --extension-id tiny-host --app-id my-shop --title "我的商店"
```

## 4. 宿主扩展包 id 注入（phone-sdk ≥ 0.4.0）

从 `0.4.0` 起，phone-sdk **不再**在业务逻辑里写死官方扩展包 id。宿主侧统一通过：

```ts
getPhoneHostExtensionId()   // → extension.json.id（构建注入）或默认回退
getOpenPhoneActionId()      // → `${hostId}.open-phone`
```

### 构建要求（宿主工程）

在 Vite 配置中注入（本仓与 `create-host-*` 模板已配置）：

```ts
define: {
  __PHONE_HOST_EXTENSION_ID__: JSON.stringify(/* 来自 extension.json.id */),
}
```

未注入时回退为兼容默认值 `ink.zenly.ext-7a9373`（便于旧工程平滑升级）。  
CSS 使用通用选择器 `[data-phone-root]` / `[data-phone-toast-root]`；DOM 仍写入真实宿主 id，便于调试。

### 验收要点

- 本仓 `pnpm build` 后，产物中注入值为 `ink.zenly.ext-7a9373`。
- 脚手架宿主构建后，动作与 `data-phone-root` 均为用户指定的 `--extension-id`，而不是强制官方 id。
- 模块 id `phone` / `phone-toast` **不会**随扩展包 id 改变。

## 5. phone-sdk 包说明与 API 要点

包名：`@ink-zenly/phone-sdk@0.4.7`（[npm](https://www.npmjs.com/package/@ink-zenly/phone-sdk)）。源码在仓库 `phone-sdk/`，细节见 [`../phone-sdk/README.md`](../phone-sdk/README.md)。

### 5.1 两个入口，不要混用

| 入口 | 给谁用 | 导出重点 |
|------|--------|----------|
| `@ink-zenly/phone-sdk`（**main**） | **宿主扩展** | `PhoneExtension`、`ToastExtension`、默认导出 |
| `@ink-zenly/phone-sdk/plugin` | **内页应用** | `registerPhoneApp`、`bootstrapPhonePluginApps`、`definePhonePluginRegistry`、类型与调试工具 |

```text
phone-sdk/src/
├── index.ts          → main（host）
├── client/           → /plugin（内页 runtime / debug / bootstrap）
└── host/             → phone / toast / studio / host-extension-id
```

### 5.2 依赖怎么装

**本仓联调（推荐维护本扩展时）：**

```json
{
  "dependencies": {
    "@ink-zenly/phone-sdk": "file:phone-sdk"
  }
}
```

**独立宿主 / 内页包（发布给第三方）：**

```json
{
  "dependencies": {
    "@ink-zenly/phone-sdk": "^0.4.7"
  }
}
```

约定：

| 角色 | phone-sdk | react / `@avg-studio/sdk` |
|------|-----------|---------------------------|
| 宿主工程 | main 打进宿主 bundle | Studio 侧 external（本仓/模板为 `file:./sdk`） |
| 内页（plugin） | 只从 `/plugin` 引用，打进内页 bundle | external |

### 5.3 宿主侧最小入口（本仓现状）

```tsx
import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerDemoShopPhoneApp } from "./demo-shop";

bootstrapPhonePluginApps(
  definePhonePluginRegistry(registerDemoShopPhoneApp),
);

export { PhoneExtension, ToastExtension } from "@ink-zenly/phone-sdk";
export { default } from "@ink-zenly/phone-sdk";
```

宿主负责：桌面、动作、消息、Toast、shared 存档、打开手机快捷键。  
内页只负责：在手机屏幕内渲染自己的 UI，并通过 `closeApp` / `closePhone` 回到桌面或关手机。

### 5.4 内页注册 API（plugin）

```tsx
import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";

export const PROGRAM_ID = "my-mail";

export function registerMyMailPhoneApp(): void {
  registerPhoneApp({
    id: PROGRAM_ID,          // 必须稳定；= 作者设置 phoneAppId
    title: "邮件",
    description: "可选说明",
    render: (props) => <MyMailApp {...props} />,
  });
}
```

`render` 收到的常用 props（`PhoneAppRenderProps`）：

| prop | 含义 |
|------|------|
| `appId` | 注册时的程序 ID |
| `closeApp` | 回桌面（**不**关手机） |
| `closePhone` | 关闭整部手机 UI |
| `safeAreaInsets` | 刘海 / Home 指示条等（px），请用于 padding |

独立扩展形态（`pack` 产物）须在 `@extension({ id })` 的 `onRegister` 里调用 `registerPhoneApp`，且 **`@extension.id` === `registerPhoneApp.id`**。完整步骤见 [§2](#2-内页应用完整开发流程)。

### 5.5 从「写好代码」到「桌面能点开」

仅 `registerPhoneApp` **不会**自动出现图标。还必须在**宿主**的作者设置中：

1. **动作 · 手机内部应用**：`phoneAppId` = 程序 ID（如 `my-mail`）
2. **手机应用目录**：`默认动作 ID` 指向上述动作；建议开启「游戏开始默认预装」

然后 `pnpm build` / `watch` → Studio 重载扩展 → 剧本 Preview 中 `mount-phone` → 快捷键打开 → 点击 APP。

### 5.6 宿主能力摘要（作者向）

这些能力由 phone-sdk **main**（`PhoneExtension`）提供，无需写内页代码：

- 苹果 / 安卓外壳、四列桌面、快捷键打开（`<扩展包 id>.open-phone`）
- 动作分组：程序 UI / 可视化 UI / 系统界面 / 内部方法 / **手机内部应用**
- APP 安装·删除·禁用·解禁 + 可选 Toast
- 玩家个性化（shared）
- `show-message`：角色预设、头像、消息组、聊天背景、头像/名称可见性、气泡样式

作者侧配置见根目录 [README.md](../README.md)。

## 6. 版本更新日志

下列要点依据本仓库 `git` 历史与 npm 已发布版本整理。  
**npm 已发布**的 phone-sdk：`0.3.0`、`0.3.1`、`0.4.0`、`0.4.6`（`0.4.7` 为仓库当前）；create-phone-app：`0.1.0`–`0.1.5`、`0.3.0`–`0.3.3`。  
中间仅出现在 git、未单独发到 npm 的版本号，会标注「仓库版本」。

### 6.1 本仓扩展（`extension.json`）

| 版本 | 要点 |
|------|------|
| **1.1.1**（当前） | 对方回复前将我方未读标为已读（默认开）；未读→已读不重播入场动画。 |
| **1.1.0** | 对齐 phone-sdk `0.4.6+` / CLI `0.3.3`。气泡样式、头像/名称可见性、QQ 风名称排版；文档拆分使用/开发。 |
| **0.2.0** | 能力成型期：Toast、APP 安装/禁用、消息聊天背景、苹果/安卓外壳、可配置打开快捷键、剧本块内联展示优化、多 Preview 隔离修复等（相对 0.1.x 的大版本说明）。 |
| **0.1.3** | 版本号与 README 整理。 |
| **0.1.2** | 头像相关调整。 |
| **0.1.1** | 修复手机未弹出等问题。 |
| **0.1.0** | 初版：挂载手机、桌面 APP、聊天角色预设与 `show-message` 等基础能力。 |

### 6.2 `@ink-zenly/phone-sdk`

| 版本 | npm | 要点 |
|------|-----|------|
| **0.4.7**（仓库） | ❌ 未发 npm | 设置「对方回复前将我方未读标为已读」（默认开）：下一条为对方消息时，点击先把已显示的我方 `unread` 改为 `read`，再点才追加对方消息。 |
| **0.4.6** | ✅ | 气泡名称改为气泡**上方加粗**（QQ 风）；字号/颜色表单预填与 `phone.css` 对齐；**自定义 CSS 新建不预填**（说明中保留占位示例）；文字/名称色支持 `rgba()`；发布包清理临时单测文件。 |
| **0.4.4～0.4.5**（仓库） | ❌ 未单独发 npm | 聊天角色预设气泡样式（字号、文字/名称/对话框色、`customCss` 消毒与合并）；`show-message` 快照写入样式；组级头像/名称枚举定稿为「跟随预设 / 显示 / 隐藏」。内容合入 **0.4.6** 发布。 |
| **0.4.1**（仓库） | ❌ 未单独发 npm | 预设与 `show-message` 支持头像/名称可见性；气泡按开关隐藏头像与名称。合入后续 0.4.x。 |
| **0.4.0** | ✅ | **宿主扩展包 id 可注入**（`__PHONE_HOST_EXTENSION_ID__` / `getPhoneHostExtensionId`）；打开手机动作与 DOM `data-*` 跟宿主 id；不再业务写死官方包 id；CSS 通用选择器 `[data-phone-root]`。 |
| **0.3.1** | ✅ | 随脚手架/宿主分包演进的过渡发布（与 0.3.0 同代内页 SDK 能力）。 |
| **0.3.0** | ✅ | 源码结构转向「宿主 + 内页」：catalog / host UI 拆分，强调内页应用开发体验。 |
| **0.2.0**（仓库早期） | — | SDK 包完善期（相对 0.1.3）。 |
| **0.1.3**（仓库） | — | **内联 SDK 初版**：第三方可基于手机做内页应用（`registerPhoneApp` 方向的起点）。 |

### 6.3 `@ink-zenly/create-phone-app`

| 版本 | npm | 要点 |
|------|-----|------|
| **0.3.3** | ✅ | `inkZenly.phoneSdkVersion` → `^0.4.6`；修复 Windows 下 bin 入口 CRLF 导致 npm 丢弃 `bin` 的问题；文档钉版本更新。 |
| **0.3.2** | ✅ | **宿主扩展包 id 与内页 app-id 分开指定**；不再生成 `ink.zenly.phone-app-*`；`pack` 的内页包 `extension.json.id` 默认同 app-id，可用 `--extension-id` 覆盖。 |
| **0.3.1** | ✅ | 跟进 phone-sdk `0.4.0` 宿主 id 注入；模板 `vite.config.ts` 写入 `__PHONE_HOST_EXTENSION_ID__`。 |
| **0.3.0** | ✅ | 正式能力：`create`（宿主 + 首个内页）+ `pack`（抽离 `release/`）；模板 default / minimal；标题转义、交互前校验 app-id 等修复并入同代。 |
| **0.1.5～0.1.0** | ✅ | CLI 骨架与早期 `create` / `add` 实验版本（包版本曾跳号至 0.3.0，中间无 0.2.x 发布线）。 |

### 6.4 功能演进时间线（跨包）

按仓库提交脉络归纳（同一功能可能跨多个包版本）：

1. **手机壳与桌面**：四列 APP、苹果/安卓样式、挂载/卸载、快捷键打开。  
2. **动作体系**：程序 UI / 可视化 UI / 系统界面 / 内部方法；后增 **手机内部应用**。  
3. **剧情消息**：聊天角色预设、头像来源、消息状态与组接续、聊天背景；多 Preview 隔离修复。  
4. **APP 生命周期 + Toast**：安装/删除/禁用/解禁；独立 `phone-toast`、快进不弹 Toast。  
5. **个性化与 shared**：背景/图标/颜色/名称/动作绑定；玩家权限开关。  
6. **Phone SDK 内页**：`registerPhoneApp`、bootstrap 注册表、本仓 `src/<app-id>/` 开发模型。  
7. **脚手架**：`create` / `add` / `pack`，两层 ID，标准内页包分发。  
8. **多宿主就绪**：宿主扩展包 id 注入（phone-sdk ≥ 0.4.0）。  
9. **消息表现增强**：头像/名称可见性（预设 + 组级三态）；气泡自定义样式；名称 QQ 风排版。

### 6.5 升级建议

| 从…升级 | 建议 |
|---------|------|
| 旧宿主（写死官方扩展 id）→ phone-sdk ≥ 0.4.0 | 确认 Vite `define` 注入 `__PHONE_HOST_EXTENSION_ID__`；核对 Studio「输入按键」是否改为 `<你的扩展包 id>.open-phone`。 |
| CLI ≤ 0.3.1 → ≥ 0.3.2 | `create` 必须同时传 `--extension-id` 与 `--app-id`；检查文档/脚本里是否仍假设自动生成 `ink.zenly.phone-app-*`。 |
| phone-sdk ≤ 0.4.0 → 0.4.6 | 可直接升 `^0.4.6`；新气泡样式字段可选；已有空字段行为与样式表回退兼容。 |
| 仅用本仓扩展、不写内页 | 升级扩展构建产物即可；CLI / plugin API 可忽略。 |

查 npm 最新版：

```powershell
npm view @ink-zenly/phone-sdk version --registry https://registry.npmjs.org/
npm view @ink-zenly/create-phone-app version --registry https://registry.npmjs.org/
```
