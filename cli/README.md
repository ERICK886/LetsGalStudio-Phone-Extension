# create-phone-app

> 包名：`@ink-zenly/create-phone-app`  
> 用途：脚手架生成 LetsGal 手机宿主扩展与内页应用（Phone SDK plugin）

本 CLI 提供三条路径：

| 命令 | 场景 |
|------|------|
| `create` | 生成**手机宿主**扩展工程（含首个内页，可本地开发调试） |
| `add` | 在**已有宿主** `src/<app-id>/` 添加内页，并自动注入 `src/index.tsx` 注册表 |
| `pack` | 将宿主内 `src/<app-id>/` **抽离**为 `release/` 标准内页包（可单独分发） |

参考实现：本仓 `src/demo-shop/`（内页示例）+ 根 `src/index.tsx`（宿主注册入口）。

---

## 安装 / 调用

### 本仓库（推荐开发时）

在扩展根目录：

```powershell
pnpm create-phone-app --help
pnpm create-phone-app create --help
pnpm create-phone-app add --help
pnpm create-phone-app pack --help
```

根 `package.json` 已提供 script：`create-phone-app` → `node ./cli/bin/create-phone-app.js`。

### 无参向导

不传子命令时进入交互，可选择 `create` 或 `add`：

```powershell
pnpm create-phone-app
```

### 已发布包

```powershell
pnpm dlx @ink-zenly/create-phone-app@0.3.1 create .\my-host --template default --app-id my-shop --title "我的商店"
```

本仓开发仍推荐：`pnpm create-phone-app`。

---

## `create`：手机宿主扩展

在目标目录生成**宿主** Vite + TypeScript 扩展骨架：入口 `src/index.tsx` 导出 `PhoneExtension` 并注册首个内页 `src/<app-id>/`。依赖 `@ink-zenly/phone-sdk` 的 **npm 版本**（如 `^0.4.0`），捆绑 `@avg-studio/sdk` 于 `./sdk`。`create` 宿主模板的 `vite.config.ts` 已从 `extension.json` 注入 `__PHONE_HOST_EXTENSION_ID__`。

```powershell
pnpm create-phone-app create .\my-host --template default --app-id my-shop --title "我的商店"
pnpm create-phone-app create .\tiny --template minimal --app-id tiny --title 精简 --force
```

| 选项 | 说明 |
|------|------|
| `[dir]` | 目标目录（可缺省，交互询问） |
| `--template` | `default`（完整 README）或 `minimal`（最小） |
| `--app-id` | 程序 ID，须匹配 `^[a-z][a-z0-9-]*$` |
| `--title` | 显示标题 |
| `--force` | 允许写入非空目录 |

生成后（宿主开发）：

```powershell
cd <dir>
pnpm install
pnpm watch
# 或 pnpm build
```

**分发内页**请使用 `pack`（见下），产物在 `./release/`，宿主 `.gitignore` 已忽略 `release/`。

### 模板说明

| 模板 | 目录 | 内容 |
|------|------|------|
| `default` | `cli/templates/create-host-default/` | 完整宿主脚手架 + 详细 README |
| `minimal` | `cli/templates/create-host-minimal/` | 同上，README 更短 |

两者均含：`package.json`、`extension.json`、`vite.config.ts`、`src/index.tsx`、捆绑 `sdk/`；首个内页来自 `cli/templates/add/`。

---

## `pack`：抽离标准内页包

在宿主仓库根（含 `definePhonePluginRegistry` 的 `src/index.tsx`）下，将 `src/<app-id>/` 渲染为 **标准内页扩展** 到 `release/`（默认），并自动执行 `pnpm install && pnpm build`。

```powershell
pnpm create-phone-app pack demo-shop
pnpm create-phone-app pack demo-shop --force
pnpm create-phone-app pack demo-shop --out ./release --title "演示商店"
```

| 选项 | 说明 |
|------|------|
| `[app-id]` | 程序 ID（可缺省；交互终端下列出 `src/*/index.tsx` 供选择） |
| `--cwd` | 向上查找宿主根的起始目录（默认 `process.cwd()`） |
| `--out` | 输出目录，默认 `release`（相对宿主根或绝对路径） |
| `--force` | 允许写入非空目标目录 |
| `--title` | 扩展显示标题（默认与 app-id 相同） |

产物特点：

- 入口 `dist/index.mjs`，**不含**手机宿主（`PhoneExtension`）
- **不含** `phone-sdk/`、`scripts/`、`docs/`、`dev-host*`、`extension.dev.json`、`dist-dev/`
- 分发时需同时启用手机宿主扩展，宿主 `phoneAppId` 须与内页 app-id 一致

非交互环境（CI / 管道）未传 app-id 时会报错「请指定 app-id」。

---

## `add`：本仓内页

在宿主仓库根下创建 `src/<app-id>/`，并注入：

- `import { registerXxxPhoneApp } from "./<app-id>"`
- 将 `registerXxxPhoneApp` 加入 `definePhonePluginRegistry(...)`

注册函数名规则：`register` + PascalCase(appId) + `PhoneApp`  
（例：`demo-shop` → `registerDemoShopPhoneApp`）

```powershell
pnpm create-phone-app add notes --title "便签"
pnpm create-phone-app add notes --title "便签" --force
```

| 选项 | 说明 |
|------|------|
| `[app-id]` | 程序 ID（kebab-case） |
| `--title` | 显示标题 |
| `--cwd` | 向上查找宿主根的起始目录（默认 `process.cwd()`） |
| `--force` | 允许覆盖已存在的 `src/<app-id>/` |

模板来源：`cli/templates/add/`（`index.tsx` + `app.tsx`）。

添加后请执行 `pnpm build`，并在 Studio 中配置「动作 · 手机内部应用」绑定同一 `app-id`。

---

## app-id 规则

合法：`^[a-z][a-z0-9-]*$`（小写字母开头，仅小写字母 / 数字 / 连字符）。

非法示例：`Bad_Id`、`123shop`、`MyApp`。

已提供 `app-id`（含位置参数）时会在进入交互前校验；非法值立即输出中文错误并以非零退出。仅 app-id 合法且缺少 `--title` 时才会进入标题交互。

---

## 与 `demo-shop` / phone-sdk 的关系

- **`src/demo-shop/`**：本仓手写参考内页；`add` / `create` 生成的内页结构与之对齐。
- **`@ink-zenly/phone-sdk`**：宿主与内页 API；CLI 通过读取本仓 `phone-sdk/package.json` 的 `version`，在模板 `package.json` 中写入 `^<version>`。
- **禁止**脚手架默认输出 `file:../phone-sdk`；联调时可本地改依赖，勿改 CLI 默认行为。
- **`pack`** 会在 release 目录自动 `pnpm install` + `pnpm build`；**create / add** 首版不自动 install。

---

## 开发与测试（维护者）

```powershell
cd cli
node --import tsx --test src/**/*.test.ts
```

工具单测覆盖：校验、命名、模板拷贝、注册表注入、宿主根查找、pack 路径校验等。
