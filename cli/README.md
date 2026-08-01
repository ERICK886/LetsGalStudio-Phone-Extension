# create-phone-app

> 包名：`@ink-zenly/create-phone-app`  
> 用途：脚手架生成 LetsGal 手机内页应用（Phone SDK plugin）

本 CLI 提供两条路径：

| 命令 | 场景 |
|------|------|
| `create` | 生成**独立** Studio 扩展工程（可单独发布） |
| `add` | 在**本仓库** `src/<app-id>/` 添加内页，并自动注入 `src/index.tsx` 注册表 |

参考实现：本仓 `src/demo-shop/`（内页示例）+ 根 `src/index.tsx`（注册入口）。

---

## 安装 / 调用

### 本仓库（推荐开发时）

在扩展根目录：

```powershell
pnpm create-phone-app --help
pnpm create-phone-app create --help
pnpm create-phone-app add --help
```

根 `package.json` 已提供 script：`create-phone-app` → `node ./cli/bin/create-phone-app.js`。

### 无参向导

不传子命令时进入交互，可选择 `create` 或 `add`：

```powershell
pnpm create-phone-app
```

### 未来发布后（规划）

```powershell
npx @ink-zenly/create-phone-app create my-shop
```

当前包为仓库内 `private`，以本仓 `pnpm create-phone-app` 为准。

---

## `create`：独立内页扩展

在目标目录生成完整 Vite + TypeScript 扩展骨架，依赖 `@ink-zenly/phone-sdk` 的 **npm 版本**（如 `^0.3.0`），**不会**写成 `file:`。

```powershell
pnpm create-phone-app create .\my-shop --template default --app-id my-shop --title "我的商店"
pnpm create-phone-app create .\tiny --template minimal --app-id tiny --title 精简 --force
```

| 选项 | 说明 |
|------|------|
| `[dir]` | 目标目录（可缺省，交互询问） |
| `--template` | `default`（完整）或 `minimal`（最小） |
| `--app-id` | 程序 ID，须匹配 `^[a-z][a-z0-9-]*$` |
| `--title` | 显示标题 |
| `--force` | 允许写入非空目录 |

生成后需自行：

```powershell
cd <dir>
pnpm install
pnpm build
```

> 若 npm registry 尚无 `@ink-zenly/phone-sdk`，`pnpm install` 可能失败——属预期；骨架文件仍应齐全。可将依赖临时改为本仓 `phone-sdk` 的本地路径做联调，但**脚手架默认与文档约定始终写 npm 版本**。

### 模板说明

| 模板 | 目录 | 内容 |
|------|------|------|
| `default` | `cli/templates/create-default/` | 完整独立扩展 + 较详细 README |
| `minimal` | `cli/templates/create-minimal/` | 最小可构建骨架 |

两者均含：`package.json`、`extension.json`、`vite.config.ts`、`tsconfig.json`、`src/index.tsx`、`src/app.tsx` 等。

---

## `add`：本仓内页

在宿主仓库根（含 `definePhonePluginRegistry` 的 `src/index.tsx`）下创建 `src/<app-id>/`，并注入：

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

- **`src/demo-shop/`**：本仓手写参考内页；`add` 生成的结构与之对齐，便于对照学习。
- **`@ink-zenly/phone-sdk`**：宿主与内页 API；CLI 通过读取本仓 `phone-sdk/package.json` 的 `version`，在模板 `package.json` 中写入 `^<version>`。
- **禁止**脚手架默认输出 `file:../phone-sdk`；联调时可本地改依赖，勿改 CLI 默认行为。
- **首版不自动** `pnpm install`；**不**生成宿主 `PhoneExtension` 实现（独立工程复用 sdk 导出）。

---

## 开发与测试（维护者）

```powershell
cd cli
node --import tsx --test src/**/*.test.ts
```

工具单测覆盖：校验、命名、模板拷贝、注册表注入、宿主根查找等。
