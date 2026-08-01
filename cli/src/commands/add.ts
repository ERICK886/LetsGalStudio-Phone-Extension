/**
 * @file add.ts
 * @description `create-phone-app add`：在本仓 src/<app-id>/ 添加内页并注入注册表。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import pc from "picocolors";

import { resolvePhoneSdkVersion, TEMPLATES_DIR } from "../constants.ts";
import { promptAddOptions } from "../prompts.ts";
import { findHostRepoRoot } from "../utils/fs.ts";
import { injectPhoneAppRegistry } from "../utils/inject.ts";
import {
  toExtensionId,
  toPackageName,
  toPascalCase,
  toRegisterFnName,
} from "../utils/names.ts";
import { copyTemplateDir } from "../utils/template.ts";
import { assertValidAppId } from "../utils/validate.ts";

/** add 命令入参（均可缺省，缺省走交互） */
export type RunAddOptions = {
  appId?: string;
  title?: string;
  cwd?: string;
  force?: boolean;
};

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
 * 判断 add 选项是否已齐全（可跳过交互）。
 *
 * @param opts - 原始选项
 * @returns 齐全为 true
 */
function hasAllAddFields(opts: RunAddOptions): boolean {
  return Boolean(opts.appId?.trim() && opts.title?.trim());
}

/**
 * 执行 add：写入 `src/<app-id>/` 并注入宿主 `src/index.tsx` 注册。
 *
 * 注入失败时不回滚已写入的应用文件，仅提示手动注册（YAGNI）。
 *
 * @param opts - 命令行选项；缺失字段会进入交互补全
 * @returns Promise<void>
 * @throws Error 找不到宿主根、app-id 非法、目标已存在且未 --force、注入失败时抛出
 *
 * @example
 * ```ts
 * await runAdd({ appId: "notes", title: "便签", cwd: process.cwd() });
 * ```
 */
export async function runAdd(opts: RunAddOptions): Promise<void> {
  const filled = hasAllAddFields(opts)
    ? {
        appId: opts.appId!.trim(),
        title: opts.title!.trim(),
        force: opts.force ?? false,
      }
    : await promptAddOptions({
        appId: opts.appId,
        title: opts.title,
        force: opts.force,
      });

  const { appId, title, force } = filled;
  const startDir = opts.cwd?.trim() || process.cwd();
  const root = findHostRepoRoot(startDir);

  if (!root) {
    throw new Error(
      `未找到宿主仓库根（从 ${startDir} 向上查找须存在含 definePhonePluginRegistry 的 src/index.tsx）`,
    );
  }

  assertValidAppId(appId);

  const dest = join(root, "src", appId);

  if (existsSync(dest) && !force) {
    throw new Error(
      `目标已存在：${dest}。若确认覆盖请添加 --force`,
    );
  }

  const pascalName = toPascalCase(appId);
  const registerFnName = toRegisterFnName(appId);
  const packageName = toPackageName(appId);
  const extensionId = toExtensionId(appId);
  const phoneSdkVersion = resolvePhoneSdkVersion();
  const author = "池水三两升";
  const date = todayDate();

  // 模板变量至少包含 brief 要求的全部键（add 模板实际用到其中子集）
  const vars: Record<string, string> = {
    appId,
    title,
    packageName,
    extensionId,
    phoneSdkVersion,
    author,
    date,
    pascalName,
    registerFnName,
  };

  const templateDir = join(TEMPLATES_DIR, "add");
  const files = await copyTemplateDir(templateDir, dest, vars);

  const indexPath = join(root, "src", "index.tsx");
  let injected = false;

  try {
    const source = readFileSync(indexPath, "utf8");
    const next = injectPhoneAppRegistry(source, appId);

    writeFileSync(indexPath, next, "utf8");
    injected = true;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);

    // YAGNI：不自动回滚已写入的 src/<app-id>/，提示用户手动注册
    throw new Error(
      `应用文件已生成于 ${dest}，但自动注册失败：${detail}。请手动在 src/index.tsx 中注册 ${registerFnName}`,
    );
  }

  console.log();
  console.log(pc.green("✔ 已添加本仓内页应用"));
  console.log(`  仓库：${pc.cyan(root)}`);
  console.log(`  目录：${pc.cyan(dest)}`);
  console.log(`  应用：${pc.cyan(appId)}（${title}）`);
  console.log(`  注册：${pc.cyan(registerFnName)}`);
  console.log(`  文件：${files.length} 个`);
  console.log(
    injected
      ? `  注入：${pc.green("已更新 src/index.tsx")}`
      : `  注入：${pc.yellow("跳过")}`,
  );
  console.log();
}
