#!/usr/bin/env node
/**
 * @file create-phone-app.js
 * @description @ink-zenly/create-phone-app bin 入口：用 tsx 加载 TypeScript CLI。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let tsxCli;

try {
  tsxCli = require.resolve("tsx/cli");
} catch {
  console.error(
    "错误：找不到 tsx 依赖。请重新安装本包：npm i -g @ink-zenly/create-phone-app 或在项目中 pnpm add -D @ink-zenly/create-phone-app。",
  );
  process.exit(1);
}

const entry = join(__dirname, "../src/index.ts");
const result = spawnSync(process.execPath, [tsxCli, entry, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
