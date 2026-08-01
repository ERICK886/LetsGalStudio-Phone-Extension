# 内页插件 CLI 脚手架设计

> **日期**：2026-08-01  
> **状态**：已批准（待实现）  
> **范围**：仓库根目录 `cli/`，提供内页插件初始化脚手架（独立扩展 + 本仓内页）  
> **相关**：`phone-sdk/README.md`、`docs/superpowers/specs/2026-08-01-plugin-dev-preview-design.md`、`src/demo-shop/`

## 1. 目标

1. 在根目录提供符合市面习惯的 CLI（`create-vite` / `create-vue` 同类体验）。
2. 同一工具同时支持：
   - **create**：生成独立 Studio 内页扩展工程；
   - **add**：在本仓库 `src/<app-id>/` 增加内页应用并挂到引导入口。
3. 无参进入交互向导；带 flags 时可非交互（CI 友好）。
4. `cli/` 做成可发布 npm 包，根 `package.json` 用 scripts 映射本地调用。

## 2. 非目标（YAGNI）

- 不引入 plop / hygen / 重型脚手架框架。
- 首版不自动执行 `pnpm install`（后续可加 `--install`）。
- 不生成手机宿主（`PhoneExtension`）；只生成内页侧。
- 不提供 GUI。
- 不生成 `file:` 依赖；`@ink-zenly/phone-sdk` **始终写 npm 版本号**。

## 3. 用户决策摘要

| 项 | 选择 |
|----|------|
| 覆盖范围 | 独立扩展 + 本仓内页（C） |
| 调用形态 | 子命令 `create`/`add` + 无参交互 + flags（C） |
| 包形态 | `cli/` 可发布包 + 根 scripts（C） |
| 模板 | 可切换：`default`（完整）/ `minimal`（C） |
| phone-sdk 依赖 | 始终 npm 版本（B） |
| 实现路径 | 轻量 Node ESM CLI（方案 1） |

## 4. 架构

```text
用户
  ├─ npx @ink-zenly/create-phone-app [create|add|…]
  └─ pnpm create-phone-app …
        │
        ▼
cli/bin/create-phone-app.js
        │
        ▼
cli/src (citty + @clack/prompts)
  ├─ commands/create.ts  → 渲染 templates/create-default|create-minimal
  └─ commands/add.ts     → 渲染 templates/add + 注入 src/index.tsx
```

### 4.1 目录结构

```text
cli/
├── package.json                 # @ink-zenly/create-phone-app
├── bin/create-phone-app.js
├── src/
│   ├── index.ts                 # 命令注册；无参默认向导
│   ├── commands/
│   │   ├── create.ts
│   │   └── add.ts
│   ├── prompts.ts
│   ├── utils/                   # 校验、拷贝模板、变量替换、入口注入
│   └── constants.ts             # phone-sdk 版本等
└── templates/
    ├── create-default/
    ├── create-minimal/
    └── add/
```

根 `package.json` 增加：

```json
"create-phone-app": "node ./cli/bin/create-phone-app.js"
```

## 5. 命令面

### 5.1 通用

| 方式 | 示例 |
|------|------|
| npx | `npx @ink-zenly/create-phone-app create my-shop` |
| 本仓 | `pnpm create-phone-app add demo-notes` |
| 向导 | `npx @ink-zenly/create-phone-app` → 选 create / add |

`--help` 输出用法、选项与示例，符合常见 CLI 习惯。

### 5.2 `create [dir]`

| 选项 | 说明 |
|------|------|
| `--template default\|minimal` | 默认 `default` |
| `--app-id <id>` | 程序 ID（默认由目录名推导） |
| `--title <title>` | 显示标题 |
| `--force` | 允许写入非空目录 |

行为：

1. 解析目标目录；非空且无 `--force` 则中止。
2. 校验 `app-id`：`^[a-z][a-z0-9-]*$`。
3. 拷贝对应模板，替换占位变量。
4. 打印下一步：`cd` → `pnpm i` → `pnpm build`，并提醒配置宿主 `phoneAppId`。

### 5.3 `add [app-id]`

| 选项 | 说明 |
|------|------|
| `--title <title>` | 显示标题 |
| `--cwd <path>` | 仓库根；默认向上查找含 `src/index.tsx` 且为 bootstrap 模式的目录 |
| `--force` | 覆盖已存在的 `src/<app-id>/` |

行为：

1. 确认 cwd 为本仓结构（存在 `src/index.tsx`，且可识别 `bootstrapPhonePluginApps` / `definePhonePluginRegistry`）。
2. 校验 app-id；目录已存在则需 `--force`。
3. 写出 `src/<app-id>/index.tsx` 与 `app.tsx`（对齐 `demo-shop` 模式）。
4. 注入 `src/index.tsx`（见 §6）。
5. 不修改 `extension.json` 与根依赖。

## 6. `add` 入口注入规则

对 `src/index.tsx` 做**保守文本/结构注入**：

1. 在现有 `import { register… } from "./…"` 旁增加：
   `import { registerXxxPhoneApp } from "./<app-id>";`
2. 在 `definePhonePluginRegistry(...)` 参数列表末尾追加 `registerXxxPhoneApp`。
3. 找不到锚点时：**报错并提示手动注册，不静默改写文件**，进程非零退出。

函数命名约定：`register` + PascalCase(appId) + `PhoneApp`  
（例：`demo-shop` → `registerDemoShopPhoneApp`）。

## 7. 模板内容

### 7.1 占位变量

| 变量 | 用途 |
|------|------|
| `{{appId}}` | 程序 / 应用 ID |
| `{{title}}` | 显示名 |
| `{{packageName}}` | npm 包名 |
| `{{extensionId}}` | `extension.json` 的 id |
| `{{phoneSdkVersion}}` | `@ink-zenly/phone-sdk` 的 npm 版本（如 `^0.3.0`） |
| `{{author}}` | 作者（可空） |

替换实现：简单 `{{var}}` 字符串替换，不引入 Handlebars。

### 7.2 `create-default`

- `extension.json`、`package.json`
  - `dependencies`：`@ink-zenly/phone-sdk`（npm 版本，见 §8）
  - `peerDependencies` / `devDependencies`：`react`、`react-dom`、`@avg-studio/sdk`（与 Studio 扩展惯例一致；sdk 可用 file 或文档约定的安装方式，模板内写明）
- Vite + TypeScript + React（`external`：`react` / `@avg-studio/sdk`，与 phone-sdk README 一致）
- `src/index.tsx`：独立扩展模式——`@extension` + `registerPhoneApp`（非本仓 bootstrap 清单模式）
- `src/app.tsx`：安全区内页示例
- README、`build` / `watch`、基础 `tsconfig`

### 7.3 `create-minimal`

在 default 基础上去掉长 README、多余样式与说明性脚本，保留可 `pnpm build` 进 Studio 的最小集。

### 7.4 `add`

- `index.tsx`：`PROGRAM_ID` + `registerXxxPhoneApp`
- `app.tsx`：安全区内页骨架（对齐 `src/demo-shop`）

## 8. 技术栈与版本

| 项 | 选择 |
|----|------|
| 运行时 | Node ≥ 18，纯 ESM |
| CLI 框架 | `citty` |
| 交互 | `@clack/prompts` |
| 着色 | `picocolors` |
| 模板 | 静态文件 + `{{var}}` |
| 执行 | 首版 `tsx` 跑 TypeScript，bin 指向启动脚本；或 prepublish 编到 `dist/` |
| CLI 版本 | 首版 `0.1.0`，与 monorepo 可独立 semver |

**phone-sdk 版本来源**：`cli/src/constants.ts` 读取本仓 `phone-sdk/package.json` 的 `version`，生成时写成 `^x.y.z`。若包尚未发布到 registry，文档注明需先发布或临时手改依赖。

## 9. 错误处理与日志

- 目标非空 / 非法 app-id / cwd 结构不符 / 注入失败 → 清晰中文或中英双语消息 + 非零退出。
- 成功：彩色摘要列出写入路径。
- 不吞异常；可预期错误用用户可读信息，不打印无用堆栈。

## 10. 验收标准

1. `pnpm create-phone-app` 无参能交互选择 create / add。
2. `create my-app --template minimal` 生成完整工程骨架（`pnpm i && pnpm build` 以 registry 可解析为前提）。
3. 本仓执行 `add notes --title 笔记` 生成 `src/notes/`，且 `src/index.tsx` 正确挂上 register。
4. 非法 app-id、非空目录、注入失败均有清晰非零退出。
5. `--help` 符合常见 CLI 习惯。

## 11. 实现顺序建议

1. 搭建 `cli/` 包骨架（package.json、bin、citty 入口）。
2. 实现模板拷贝与变量替换工具。
3. 实现 `create` + 两套模板。
4. 实现 `add` + `src/index.tsx` 注入。
5. 无参向导、根 scripts、`--help` 与 README 片段。
6. 按 §10 手工验收。
