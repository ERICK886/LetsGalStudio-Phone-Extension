# Create Phone App CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在仓库根目录 `cli/` 交付可发布的 `@ink-zenly/create-phone-app`，支持 `create`（独立内页扩展）与 `add`（本仓 `src/<app-id>/`），交互与 flags 并存。

**Architecture:** 轻量 Node ESM CLI（citty + @clack/prompts + picocolors）；静态 `templates/` + `{{var}}` 替换；`add` 对 `src/index.tsx` 做保守文本注入。bin 用 `tsx` 加载 TypeScript 源码。

**Tech Stack:** Node ≥ 18、TypeScript、citty、@clack/prompts、picocolors、tsx；生成工程为 Vite + React + `@ink-zenly/phone-sdk`（npm 版本）。

**Spec:** `docs/superpowers/specs/2026-08-01-create-phone-app-cli-design.md`

## Global Constraints

- 语言与注释：CLI 源码与模板文件顶部含文件头注释（文件名、作者「池水三两升」、日期、版本）；函数含参数/返回值/异常/示例注释；必要空行。
- 对话与用户可见 CLI 文案：中文为主。
- `@ink-zenly/phone-sdk` 依赖**始终**写 npm 版本（如 `^0.3.0`），禁止 `file:`。
- 不引入 plop/hygen；首版不自动 `pnpm install`；不生成宿主 PhoneExtension。
- app-id 正则：`^[a-z][a-z0-9-]*$`。
- 注册函数名：`register` + PascalCase(appId) + `PhoneApp`（`demo-shop` → `registerDemoShopPhoneApp`）。
- PowerShell 环境：命令用 `;` 连接，不用 bash `&&` / HEREDOC。

## File Structure

| 路径 | 职责 |
|------|------|
| `cli/package.json` | 包元数据、bin、dependencies |
| `cli/bin/create-phone-app.js` | bin 入口，tsx 加载 `src/index.ts` |
| `cli/tsconfig.json` | CLI 自身 TS 配置 |
| `cli/src/index.ts` | citty 根命令；无参向导分发 |
| `cli/src/constants.ts` | 读 phone-sdk version、路径常量 |
| `cli/src/prompts.ts` | 交互问题封装 |
| `cli/src/utils/validate.ts` | app-id / 目录校验 |
| `cli/src/utils/names.ts` | PascalCase、register 函数名、packageName |
| `cli/src/utils/template.ts` | 递归拷贝 + `{{var}}` 替换 |
| `cli/src/utils/inject.ts` | 注入 `src/index.tsx` |
| `cli/src/utils/fs.ts` | 找仓库根、目录是否非空 |
| `cli/src/commands/create.ts` | create 子命令 |
| `cli/src/commands/add.ts` | add 子命令 |
| `cli/templates/create-default/**` | 完整独立扩展模板 |
| `cli/templates/create-minimal/**` | 最小独立扩展模板 |
| `cli/templates/add/**` | 本仓内页片段 |
| `cli/src/utils/*.test.ts` | 工具单测（node:test） |
| 根 `package.json` | 增加 `create-phone-app` script |
| 根 `README.md`（可选短节） | 使用说明入口 |

---

### Task 1: CLI 包骨架与可运行 bin

**Files:**
- Create: `cli/package.json`
- Create: `cli/bin/create-phone-app.js`
- Create: `cli/tsconfig.json`
- Create: `cli/src/index.ts`
- Create: `cli/src/constants.ts`
- Modify: `package.json`（根 scripts）

**Interfaces:**
- Produces: `pnpm create-phone-app --help` 可运行；`resolvePhoneSdkVersion()` → `string`（如 `^0.3.0`）

- [ ] **Step 1: 创建 `cli/package.json`**

```json
{
  "name": "@ink-zenly/create-phone-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Scaffold LetsGal phone in-app plugins (create / add)",
  "bin": {
    "create-phone-app": "./bin/create-phone-app.js"
  },
  "files": [
    "bin",
    "src",
    "templates"
  ],
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@clack/prompts": "^0.10.0",
    "citty": "^0.1.6",
    "picocolors": "^1.1.1",
    "tsx": "^4.19.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^5.1.3"
  }
}
```

- [ ] **Step 2: 创建 `cli/bin/create-phone-app.js`**

```js
#!/usr/bin/env node
/**
 * @file create-phone-app.js
 * @description @ink-zenly/create-phone-app bin 入口：用 tsx 加载 TypeScript CLI。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

register("tsx/esm", pathToFileURL("./"));
await import(pathToFileURL(join(__dirname, "../src/index.ts")).href);
```

若 `register("tsx/esm")` 在当前 Node 不稳定，改用：

```js
#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const entry = join(__dirname, "../src/index.ts");
const result = spawnSync(process.execPath, [tsxCli, entry, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
```

**优先采用 spawnSync + tsx/cli 方案**（Windows 更稳）。

- [ ] **Step 3: 创建 `cli/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: 创建 `cli/src/constants.ts`**

```ts
/**
 * @file constants.ts
 * @description CLI 常量：模板路径、phone-sdk 版本解析。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** CLI 包根目录（cli/） */
export const CLI_ROOT = join(__dirname, "..");

/** 模板根目录 */
export const TEMPLATES_DIR = join(CLI_ROOT, "templates");

/**
 * 读取本仓 phone-sdk 版本并格式化为 npm 范围。
 *
 * @returns 形如 `^0.3.0` 的版本字符串
 * @throws 找不到或无法解析 phone-sdk/package.json 时抛出 Error
 *
 * @example
 * ```ts
 * resolvePhoneSdkVersion(); // "^0.3.0"
 * ```
 */
export function resolvePhoneSdkVersion(): string {
  const pkgPath = join(CLI_ROOT, "..", "phone-sdk", "package.json");
  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { version?: string };

  if (!pkg.version) {
    throw new Error(`无法从 ${pkgPath} 读取 version`);
  }

  return `^${pkg.version}`;
}
```

- [ ] **Step 5: 创建最小 `cli/src/index.ts`（仅 help）**

```ts
/**
 * @file index.ts
 * @description create-phone-app CLI 入口（citty）。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "create-phone-app",
    version: "0.1.0",
    description: "Scaffold LetsGal phone in-app plugins (create / add)",
  },
  subCommands: {},
  async run() {
    console.log("create-phone-app 0.1.0 — 子命令将在后续任务接入");
  },
});

runMain(main);
```

- [ ] **Step 6: 根 `package.json` 增加 script，安装 cli 依赖**

在根 `package.json` 的 `scripts` 中加入：

```json
"create-phone-app": "node ./cli/bin/create-phone-app.js"
```

Run（PowerShell）：

```powershell
cd C:\Users\20231\Documents\AVG-Extensions\ext-7a9373\cli; pnpm install
cd C:\Users\20231\Documents\AVG-Extensions\ext-7a9373; pnpm create-phone-app --help
```

Expected: 打印 citty help / 版本相关输出，exit 0。

- [ ] **Step 7: Commit**

```powershell
git add cli/package.json cli/bin/create-phone-app.js cli/tsconfig.json cli/src/index.ts cli/src/constants.ts cli/pnpm-lock.yaml package.json
git commit -m "feat(cli): 搭建 create-phone-app 包骨架与 bin 入口"
```

---

### Task 2: 命名与校验工具（TDD）

**Files:**
- Create: `cli/src/utils/names.ts`
- Create: `cli/src/utils/validate.ts`
- Create: `cli/src/utils/names.test.ts`
- Create: `cli/src/utils/validate.test.ts`

**Interfaces:**
- Produces:
  - `toPascalCase(appId: string): string`
  - `toRegisterFnName(appId: string): string`
  - `toPackageName(appId: string): string`
  - `toExtensionId(appId: string): string`
  - `assertValidAppId(appId: string): void`（非法抛 `Error`，message 含中文说明）
  - `APP_ID_RE`: `RegExp`

- [ ] **Step 1: 写失败测试 `cli/src/utils/names.test.ts`**

```ts
/**
 * @file names.test.ts
 * @description names 工具单测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  toPascalCase,
  toRegisterFnName,
  toPackageName,
  toExtensionId,
} from "./names.ts";

describe("names", () => {
  it("toPascalCase: demo-shop → DemoShop", () => {
    assert.equal(toPascalCase("demo-shop"), "DemoShop");
  });

  it("toRegisterFnName: demo-shop → registerDemoShopPhoneApp", () => {
    assert.equal(toRegisterFnName("demo-shop"), "registerDemoShopPhoneApp");
  });

  it("toPackageName / toExtensionId", () => {
    assert.equal(toPackageName("demo-shop"), "phone-app-demo-shop");
    assert.equal(toExtensionId("demo-shop"), "ink.zenly.phone-app-demo-shop");
  });
});
```

- [ ] **Step 2: 写失败测试 `cli/src/utils/validate.test.ts`**

```ts
/**
 * @file validate.test.ts
 * @description app-id 校验单测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertValidAppId } from "./validate.ts";

describe("assertValidAppId", () => {
  it("接受合法 id", () => {
    assert.doesNotThrow(() => assertValidAppId("demo-shop"));
    assert.doesNotThrow(() => assertValidAppId("a1"));
  });

  it("拒绝非法 id", () => {
    assert.throws(() => assertValidAppId("Demo"), /app-id/);
    assert.throws(() => assertValidAppId("-x"), /app-id/);
    assert.throws(() => assertValidAppId("a_b"), /app-id/);
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

```powershell
cd C:\Users\20231\Documents\AVG-Extensions\ext-7a9373\cli; node --import tsx --test src/utils/names.test.ts src/utils/validate.test.ts
```

Expected: FAIL（模块不存在）。

- [ ] **Step 4: 实现 `cli/src/utils/names.ts` 与 `validate.ts`**

```ts
// names.ts — 完整实现
/**
 * @file names.ts
 * @description 由 app-id 推导 PascalCase、注册函数名、包名、扩展 ID。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

/**
 * kebab-case app-id → PascalCase。
 *
 * @param appId - 如 `demo-shop`
 * @returns 如 `DemoShop`
 */
export function toPascalCase(appId: string): string {
  return appId
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}

/**
 * 注册函数名。
 *
 * @param appId - 应用 ID
 * @returns 如 `registerDemoShopPhoneApp`
 */
export function toRegisterFnName(appId: string): string {
  return `register${toPascalCase(appId)}PhoneApp`;
}

/**
 * npm 包名。
 *
 * @param appId - 应用 ID
 * @returns 如 `phone-app-demo-shop`
 */
export function toPackageName(appId: string): string {
  return `phone-app-${appId}`;
}

/**
 * extension.json id。
 *
 * @param appId - 应用 ID
 * @returns 如 `ink.zenly.phone-app-demo-shop`
 */
export function toExtensionId(appId: string): string {
  return `ink.zenly.phone-app-${appId}`;
}
```

```ts
// validate.ts
/**
 * @file validate.ts
 * @description app-id 合法性校验。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

/** 合法 app-id：小写字母开头，后接小写字母/数字/连字符 */
export const APP_ID_RE = /^[a-z][a-z0-9-]*$/;

/**
 * 断言 app-id 合法。
 *
 * @param appId - 待校验 ID
 * @returns void
 * @throws Error 非法时抛出（消息含中文说明与正则提示）
 *
 * @example
 * ```ts
 * assertValidAppId("demo-shop");
 * ```
 */
export function assertValidAppId(appId: string): void {
  if (!APP_ID_RE.test(appId)) {
    throw new Error(
      `非法 app-id「${appId}」。须匹配 ^[a-z][a-z0-9-]*$（小写字母开头，仅小写字母/数字/连字符）`,
    );
  }
}
```

- [ ] **Step 5: 跑测试确认通过**

```powershell
cd C:\Users\20231\Documents\AVG-Extensions\ext-7a9373\cli; node --import tsx --test src/utils/names.test.ts src/utils/validate.test.ts
```

Expected: PASS。

- [ ] **Step 6: Commit**

```powershell
git add cli/src/utils/names.ts cli/src/utils/validate.ts cli/src/utils/names.test.ts cli/src/utils/validate.test.ts
git commit -m "feat(cli): 添加 app-id 命名与校验工具"
```

---

### Task 3: 模板引擎与文件系统工具（TDD）

**Files:**
- Create: `cli/src/utils/template.ts`
- Create: `cli/src/utils/fs.ts`
- Create: `cli/src/utils/template.test.ts`
- Create: `cli/src/utils/fs.test.ts`

**Interfaces:**
- Produces:
  - `renderTemplateString(input: string, vars: Record<string, string>): string`
  - `copyTemplateDir(srcDir: string, destDir: string, vars: Record<string, string>): Promise<string[]>`（返回写入的相对路径列表）
  - `isDirectoryNonEmpty(dir: string): boolean`
  - `findHostRepoRoot(startDir: string): string | null`（向上找含 `src/index.tsx` 且内容含 `definePhonePluginRegistry` 的目录）

- [ ] **Step 1: 写 `template.test.ts` / `fs.test.ts`（失败先行）**

`renderTemplateString("{{appId}}-{{title}}", { appId: "a", title: "T" })` → `"a-T"`；未提供的 `{{x}}` 保持原样或按实现约定（**约定：未替换的占位保留原文本，不抛错**）。

`isDirectoryNonEmpty`：空目录 false；含文件 true；不存在 false。

`findHostRepoRoot`：对当前 monorepo 根应返回非 null。

- [ ] **Step 2: 跑测确认失败 → 实现 → 再跑通**

`template.ts` 要点：

- 递归 readdir；跳过目录名 `.git` / `node_modules`
- 读文件为 utf8，对文本扩展名（`.ts` `.tsx` `.json` `.md` `.css` `.html` `.js` `.mjs`）做替换；其他文件原样 copyFile
- 目标路径中文件名若含 `{{` 也替换

`fs.ts` 要点：

- `existsSync` + `readdirSync` 判断非空
- `findHostRepoRoot`：从 `startDir` 起 `while` 向上，读 `src/index.tsx`，`includes("definePhonePluginRegistry")` 则命中

- [ ] **Step 3: Commit**

```powershell
git add cli/src/utils/template.ts cli/src/utils/fs.ts cli/src/utils/template.test.ts cli/src/utils/fs.test.ts
git commit -m "feat(cli): 添加模板渲染与仓库根探测工具"
```

---

### Task 4: `inject.ts` 入口注入（TDD）

**Files:**
- Create: `cli/src/utils/inject.ts`
- Create: `cli/src/utils/inject.test.ts`

**Interfaces:**
- Produces:
  - `injectPhoneAppRegistry(source: string, appId: string): string`
  - 失败抛 `Error`（中文说明：找不到 import 锚点或 `definePhonePluginRegistry`）

**行为（必须与 spec §6 一致）：**

1. 计算 `fn = toRegisterFnName(appId)`、`rel = "./${appId}"`
2. 若源中已含 `from "${rel}"` 或已含 `fn` 同名 import，则幂等跳过 import 插入（仍确保 registry 含 fn）
3. 在**最后一个**匹配 `/^import .+ from ["']\.\/.+["'];?\s*$/m` 的行后插入：
   `import { ${fn} } from "${rel}";`
4. 在 `definePhonePluginRegistry(` 的参数列表中，于闭合 `)` 前追加 `, ${fn}`（若已存在则不重复）
5. 找不到 `definePhonePluginRegistry` → throw，**不返回半改写内容**

- [ ] **Step 1: 写测试夹具（基于当前 `src/index.tsx` 形态）**

输入：

```ts
import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerDemoShopPhoneApp } from "./demo-shop";

bootstrapPhonePluginApps(
  definePhonePluginRegistry(
    registerDemoShopPhoneApp
  ),
);
```

期望：增加 `import { registerNotesPhoneApp } from "./notes";`，且 registry 内为 `registerDemoShopPhoneApp, registerNotesPhoneApp`（允许换行格式由实现决定，但应用 `includes` 断言）。

额外用例：

- 无 `definePhonePluginRegistry` → throw
- 已存在 `registerNotesPhoneApp` → 不重复插入

- [ ] **Step 2: 实现并通过测试**

- [ ] **Step 3: Commit**

```powershell
git add cli/src/utils/inject.ts cli/src/utils/inject.test.ts
git commit -m "feat(cli): 实现 src/index.tsx 注册表注入"
```

---

### Task 5: `add` 模板文件

**Files:**
- Create: `cli/templates/add/index.tsx`
- Create: `cli/templates/add/app.tsx`

**Interfaces:**
- Consumes: 占位 `{{appId}}` `{{title}}` `{{registerFnName}}` `{{pascalName}}` `{{author}}` `{{date}}`
- Produces: 对齐 `src/demo-shop` 的可注册内页

- [ ] **Step 1: 写入 `cli/templates/add/index.tsx`**

内容结构对齐 `src/demo-shop/index.tsx`：

- `PROGRAM_ID = "{{appId}}"`
- `export function {{registerFnName}}(): void { registerPhoneApp({ id, title: "{{title}}", ... render: (props) => <{{pascalName}}App {...props} /> }) }`
- 文件头注释含 `{{author}}` `{{date}}`

- [ ] **Step 2: 写入 `cli/templates/add/app.tsx`**

对齐 `src/demo-shop/app.tsx`：导出 `{{pascalName}}App`，展示标题与回桌面按钮，使用 `safeAreaInsets`。

- [ ] **Step 3: Commit**

```powershell
git add cli/templates/add
git commit -m "feat(cli): 添加本仓内页 add 模板"
```

---

### Task 6: `create-default` 与 `create-minimal` 模板

**Files:**
- Create: `cli/templates/create-default/package.json`
- Create: `cli/templates/create-default/extension.json`
- Create: `cli/templates/create-default/tsconfig.json`
- Create: `cli/templates/create-default/vite.config.ts`
- Create: `cli/templates/create-default/src/index.tsx`
- Create: `cli/templates/create-default/src/app.tsx`
- Create: `cli/templates/create-default/src/vite-env.d.ts`
- Create: `cli/templates/create-default/README.md`
- Create: `cli/templates/create-minimal/`（同上但无长 README；`package.json` scripts 仅 `build`/`watch`）

**Interfaces:**
- 占位：`{{appId}}` `{{title}}` `{{packageName}}` `{{extensionId}}` `{{phoneSdkVersion}}` `{{author}}` `{{date}}` `{{pascalName}}`

**`create-default/package.json` 关键字段：**

```json
{
  "name": "{{packageName}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "watch": "vite build --watch"
  },
  "dependencies": {
    "@ink-zenly/phone-sdk": "{{phoneSdkVersion}}"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@avg-studio/sdk": "*"
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^4.2.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.1.3",
    "vite": "^5.3.1"
  }
}
```

README 必须写明：

1. `@avg-studio/sdk` 需按 Studio 文档安装（本地 sdk 目录或官方包）
2. `@ink-zenly/phone-sdk` 为 npm 版本；若未发布需手改或先发布
3. 宿主设置中配置 `phoneAppId` = `{{appId}}`

**`src/index.tsx`（独立扩展模式）：**

```tsx
import { Extension, extension } from "@avg-studio/sdk";
import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { {{pascalName}}App } from "./app";

const PROGRAM_ID = "{{appId}}";

@extension({ id: PROGRAM_ID, label: "{{title}}", exposeUI: false })
export class {{pascalName}}Controller extends Extension {
  static onRegister() {
    registerPhoneApp({
      id: PROGRAM_ID,
      title: "{{title}}",
      description: "{{title}} 内页应用",
      render: (props) => <{{pascalName}}App {...props} />,
    });
  }
}

export default {{pascalName}}Controller;
```

**`vite.config.ts`：** lib 模式，`external` 含 `react`、`react-dom`、`react/jsx-runtime`、`@avg-studio/sdk`、`@ink-zenly/phone-sdk`、`@ink-zenly/phone-sdk/plugin`；输出 `dist/index.mjs`。

**`create-minimal`：** 复制 default 结构；`README.md` 改为 10 行以内短说明；可去掉 description 长文案。

- [ ] **Step 1: 写出两套模板全部文件**
- [ ] **Step 2: 目视核对占位符拼写与 default/minimal 差异**
- [ ] **Step 3: Commit**

```powershell
git add cli/templates/create-default cli/templates/create-minimal
git commit -m "feat(cli): 添加 create-default 与 create-minimal 模板"
```

---

### Task 7: 实现 `create` 与 `add` 命令

**Files:**
- Create: `cli/src/commands/create.ts`
- Create: `cli/src/commands/add.ts`
- Create: `cli/src/prompts.ts`
- Modify: `cli/src/index.ts`

**Interfaces:**
- Consumes: Task 2–6 全部工具与模板
- Produces: citty subCommands `create` / `add`；根命令无子命令时进入向导

- [ ] **Step 1: 实现 `prompts.ts`**

导出：

- `promptWizardMode(): Promise<"create" | "add">`
- `promptCreateOptions(partial): Promise<{ dir, template, appId, title, force }>`
- `promptAddOptions(partial): Promise<{ appId, title, force }>`

使用 `@clack/prompts`；`isCancel` 时 `process.exit(0)`。

- [ ] **Step 2: 实现 `commands/create.ts`**

伪代码流程：

```ts
export async function runCreate(opts: {
  dir?: string;
  template?: "default" | "minimal";
  appId?: string;
  title?: string;
  force?: boolean;
}): Promise<void> {
  // 缺失字段 → prompts
  // assertValidAppId
  // resolve dest = path.resolve(dir)
  // if non-empty && !force → throw 中文错误
  // vars = { appId, title, packageName, extensionId, phoneSdkVersion: resolvePhoneSdkVersion(), author: "池水三两升", date: today, pascalName, registerFnName }
  // templateName = template === "minimal" ? "create-minimal" : "create-default"
  // files = await copyTemplateDir(join(TEMPLATES_DIR, templateName), dest, vars)
  // picocolors 打印成功路径 + 下一步
}
```

- [ ] **Step 3: 实现 `commands/add.ts`**

```ts
export async function runAdd(opts: {
  appId?: string;
  title?: string;
  cwd?: string;
  force?: boolean;
}): Promise<void> {
  // findHostRepoRoot(cwd ?? process.cwd())；null → throw
  // assertValidAppId
  // dest = join(root, "src", appId)；存在且 !force → throw
  // copyTemplateDir(templates/add, dest, vars)  // vars 含 registerFnName, pascalName, title...
  // 读 root/src/index.tsx → injectPhoneAppRegistry → 写回
  // 打印摘要
}
```

注入失败时：若已写入 `src/<app-id>/`，错误信息须提示「应用文件已生成，请手动注册」；**不要删除用户目录（除非本次新建且注入前可考虑；YAGNI：不自动回滚，只提示）**。

- [ ] **Step 4: 接线 `index.ts`**

```ts
import { defineCommand, runMain } from "citty";
import { runCreate } from "./commands/create.ts";
import { runAdd } from "./commands/add.ts";
import { promptWizardMode, promptCreateOptions, promptAddOptions } from "./prompts.ts";

const createCmd = defineCommand({
  meta: { name: "create", description: "创建独立内页扩展工程" },
  args: {
    dir: { type: "positional", required: false, description: "目标目录" },
    template: { type: "string", default: "default", description: "default | minimal" },
    appId: { type: "string", description: "程序 ID" },
    title: { type: "string", description: "显示标题" },
    force: { type: "boolean", default: false },
  },
  async run({ args }) {
    await runCreate({
      dir: args.dir,
      template: args.template as "default" | "minimal",
      appId: args.appId,
      title: args.title,
      force: args.force,
    });
  },
});

const addCmd = defineCommand({
  meta: { name: "add", description: "在本仓库 src/<app-id>/ 添加内页应用" },
  args: {
    appId: { type: "positional", required: false },
    title: { type: "string" },
    cwd: { type: "string" },
    force: { type: "boolean", default: false },
  },
  async run({ args }) {
    await runAdd({
      appId: args.appId,
      title: args.title,
      cwd: args.cwd,
      force: args.force,
    });
  },
});

const main = defineCommand({
  meta: {
    name: "create-phone-app",
    version: "0.1.0",
    description: "Scaffold LetsGal phone in-app plugins (create / add)",
  },
  subCommands: { create: createCmd, add: addCmd },
  async run() {
    const mode = await promptWizardMode();
    if (mode === "create") {
      const opts = await promptCreateOptions({});
      await runCreate(opts);
    } else {
      const opts = await promptAddOptions({});
      await runAdd(opts);
    }
  },
});

runMain(main);
```

注意：citty 在调用子命令时通常不跑根 `run`；无参时才进向导。若 citty 行为不同，用 `process.argv` 长度判断：无子命令名时手动进向导。

- [ ] **Step 5: 非交互烟雾测试**

```powershell
cd C:\Users\20231\Documents\AVG-Extensions\ext-7a9373
pnpm create-phone-app create --help
pnpm create-phone-app add --help
```

Expected: 显示选项说明。

- [ ] **Step 6: Commit**

```powershell
git add cli/src/commands cli/src/prompts.ts cli/src/index.ts
git commit -m "feat(cli): 实现 create / add 子命令与交互向导"
```

---

### Task 8: 端到端验收与文档

**Files:**
- Modify: `README.md`（根，增加「内页脚手架」短节）
- Create: `cli/README.md`

- [ ] **Step 1: `add` 端到端（使用临时 app-id，测完删除）**

```powershell
cd C:\Users\20231\Documents\AVG-Extensions\ext-7a9373
pnpm create-phone-app add cli-smoke --title "CLI冒烟"
```

Expected:

- 存在 `src/cli-smoke/index.tsx`、`app.tsx`
- `src/index.tsx` 含 `registerCliSmokePhoneApp`
- `pnpm build` 仍成功

然后**恢复**工作区（删除 `src/cli-smoke`，还原 `src/index.tsx`），勿把冒烟产物提交进主线，除非用户要求保留示例。

非法用例：

```powershell
pnpm create-phone-app add Bad_Id
```

Expected: 非零退出 + 中文非法 app-id 信息。

- [ ] **Step 2: `create` 端到端**

```powershell
cd C:\Users\20231\Documents\AVG-Extensions\ext-7a9373
pnpm create-phone-app create ..\phone-app-smoke --template minimal --app-id smoke --title 冒烟 --force
```

Expected: 目录含 `package.json`（dependencies.`@ink-zenly/phone-sdk` 为 `^0.3.0` 或当前版本）、`src/index.tsx`、`extension.json`。  
（`pnpm i` 可能因 registry 无包失败——属预期；骨架文件必须齐全。）

测完可删除 `..\phone-app-smoke`。

- [ ] **Step 3: 写 `cli/README.md`**

涵盖：安装/调用、`create`/`add` 示例、模板说明、phone-sdk npm 注意点、与本仓 `demo-shop` 关系。

- [ ] **Step 4: 根 README 增加 5–10 行指向 `cli/README.md`**

- [ ] **Step 5: 全量单测**

```powershell
cd C:\Users\20231\Documents\AVG-Extensions\ext-7a9373\cli; node --import tsx --test src/**/*.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```powershell
git add cli/README.md README.md
git commit -m "docs(cli): 补充 create-phone-app 使用说明"
```

---

## Self-Review (plan vs spec)

| Spec 要求 | 对应 Task |
|-----------|-----------|
| create + add | Task 7 |
| 无参向导 + flags | Task 7 |
| 可发布 cli 包 + 根 scripts | Task 1 |
| default / minimal 模板 | Task 6 |
| npm 版 phone-sdk | Task 1 constants + Task 6/7 |
| add 注入规则 | Task 4 + 7 |
| app-id 校验与错误处理 | Task 2 + 7 |
| 验收 §10 | Task 8 |
| 不做 install/宿主/GUI | 全计划未包含 |

无 TBD 占位；命名与 `toRegisterFnName` 在 Task 2/4/5/7 一致。
