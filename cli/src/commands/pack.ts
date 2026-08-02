/**
 * @file pack.ts
 * @description `create-phone-app pack`：将宿主内 `src/<app-id>/` 抽离为标准内页包。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.2
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

import pc from "picocolors";

import { resolvePhoneSdkVersion, TEMPLATES_DIR } from "../constants.ts";
import {
  escapeForJsString,
  escapeForJsonString,
} from "../utils/escape.ts";
import { findHostRepoRoot, isDirectoryNonEmpty } from "../utils/fs.ts";
import {
  toPackageName,
  toPascalCase,
  toRegisterFnName,
} from "../utils/names.ts";
import { promptPackAppId } from "../prompts.ts";
import { copyBundledAvgStudioSdk } from "../utils/sdk-bundle.ts";
import { copyTemplateDir } from "../utils/template.ts";
import {
  assertValidAppId,
  assertValidExtensionId,
} from "../utils/validate.ts";

/** pack 命令入参 */
export type RunPackOptions = {
  /** 要抽离的内页 app-id；缺省时交互选择 */
  appId?: string;
  /** 查找宿主根的起始目录，默认 `process.cwd()` */
  cwd?: string;
  /** 输出目录（相对宿主根或绝对路径），默认 `release` */
  out?: string;
  /** 允许写入非空目标目录 */
  force?: boolean;
  /** 扩展显示标题，默认与 app-id 相同 */
  title?: string;
  /**
   * 内页包 extension.json.id；缺省等于 app-id。
   */
  extensionId?: string;
};

/** pack-release 模板目录名 */
const PACK_TEMPLATE = "pack-release";

/** release 产物中禁止出现的目录名 */
const BANNED_RELEASE_DIRS = [
  "phone-sdk",
  "scripts",
  "docs",
  "dist-dev",
] as const;

/**
 * 今日日期（本地时区），格式 YYYY-MM-DD。
 *
 * @returns 日期字符串
 */
function todayDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 在指定目录同步执行 shell 命令。
 *
 * @param cwd - 工作目录
 * @param command - 可执行命令名（如 `pnpm`）
 * @param args - 命令参数
 * @returns void
 * @throws Error 进程退出码非 0 时抛出中文错误
 *
 * @example
 * ```ts
 * runInDir("/tmp/release", "pnpm", ["install"]);
 * ```
 */
function runInDir(cwd: string, command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error(
      `命令失败（exit ${result.status}）：${command} ${args.join(" ")} @ ${cwd}`,
    );
  }
}

/**
 * 断言 release 目录不含禁止的子目录。
 *
 * @param outDir - release 根目录
 * @returns void
 * @throws Error 存在禁止目录时抛出
 */
function assertBannedDirsAbsent(outDir: string): void {
  for (const banned of BANNED_RELEASE_DIRS) {
    if (existsSync(join(outDir, banned))) {
      throw new Error(`release 不应包含 ${banned}/`);
    }
  }
}

/**
 * 执行 pack：渲染 pack-release 骨架、拷贝内页源码、捆绑 sdk 并构建。
 *
 * @param opts - 命令选项
 * @returns Promise<void>
 * @throws Error 未找到宿主根、app-id 非法/缺失、内页不存在、目标非空、构建失败时抛出
 *
 * @example
 * ```ts
 * await runPack({ appId: "demo-shop", force: true });
 * // => 在宿主根 ./release/ 生成标准内页包
 * ```
 */
export async function runPack(opts: RunPackOptions): Promise<void> {
  const hostRoot = findHostRepoRoot(opts.cwd ?? process.cwd());

  if (!hostRoot) {
    throw new Error(
      "未找到宿主仓库根：请在含 definePhonePluginRegistry 的宿主工程目录内执行 pack",
    );
  }

  let appId = opts.appId?.trim();

  if (!appId) {
    if (process.stdout.isTTY) {
      appId = await promptPackAppId(hostRoot);
    } else {
      throw new Error("请指定 app-id");
    }
  }

  assertValidAppId(appId);

  const appDir = join(hostRoot, "src", appId);
  const appIndexPath = join(appDir, "index.tsx");

  if (!existsSync(appIndexPath)) {
    throw new Error(`未找到内页目录：src/${appId}/（缺少 index.tsx）`);
  }

  const outDir = resolve(hostRoot, opts.out?.trim() || "release");

  if (isDirectoryNonEmpty(outDir) && !opts.force) {
    throw new Error(
      `目标目录非空：${outDir}。若确认覆盖请添加 --force`,
    );
  }

  const title = opts.title?.trim() || appId;
  const extensionId = (opts.extensionId?.trim() || appId);
  assertValidExtensionId(extensionId);

  const pascalName = toPascalCase(appId);
  const registerFnName = toRegisterFnName(appId);
  const packageName = toPackageName(extensionId);
  const phoneSdkVersion = resolvePhoneSdkVersion();
  const author = "池水三两升";
  const date = todayDate();

  const vars: Record<string, string> = {
    appId,
    title,
    titleJs: escapeForJsString(title),
    titleJson: escapeForJsonString(title),
    packageName,
    extensionId,
    phoneSdkVersion,
    author,
    date,
    pascalName,
    registerFnName,
  };

  const templateDir = join(TEMPLATES_DIR, PACK_TEMPLATE);
  await copyTemplateDir(templateDir, outDir, vars);

  const destAppDir = join(outDir, "src", appId);
  cpSync(appDir, destAppDir, { recursive: true });

  await copyBundledAvgStudioSdk(outDir);

  runInDir(outDir, "pnpm", ["install"]);
  runInDir(outDir, "pnpm", ["build"]);

  const distEntry = join(outDir, "dist", "index.mjs");

  if (!existsSync(distEntry)) {
    throw new Error(`构建完成后未找到 dist/index.mjs：${distEntry}`);
  }

  assertBannedDirsAbsent(outDir);

  console.log();
  console.log(pc.green("✔ 已抽离标准内页包"));
  console.log(`  目录：${pc.cyan(outDir)}`);
  console.log(`  扩展包 id：${pc.cyan(extensionId)}`);
  console.log(`  内页程序 id：${pc.cyan(appId)}（${title}）`);
  console.log(`  入口：${pc.cyan("dist/index.mjs")}`);
  console.log();
  console.log(pc.bold("分发说明："));
  console.log(
    "  本包为标准内页扩展，需同时启用手机宿主扩展",
  );
  console.log(`  宿主 phoneAppId 须配置为 ${pc.cyan(appId)}`);
  console.log();
}
