/**
 * @file create.ts
 * @description `create-phone-app create`：脚手架独立内页扩展工程。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { join, resolve } from "node:path";

import pc from "picocolors";

import { resolvePhoneSdkVersion, TEMPLATES_DIR } from "../constants.ts";
import { promptCreateOptions } from "../prompts.ts";
import {
  escapeForJsString,
  escapeForJsonString,
} from "../utils/escape.ts";
import { isDirectoryNonEmpty } from "../utils/fs.ts";
import {
  toExtensionId,
  toPackageName,
  toPascalCase,
  toRegisterFnName,
} from "../utils/names.ts";
import { copyTemplateDir } from "../utils/template.ts";
import { assertValidAppId } from "../utils/validate.ts";

/** create 命令入参（均可缺省，缺省走交互） */
export type RunCreateOptions = {
  dir?: string;
  template?: "default" | "minimal";
  appId?: string;
  title?: string;
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
 * 校验并规范化模板名。
 *
 * @param template - 用户输入的模板标识
 * @returns `"default"` 或 `"minimal"`
 * @throws Error 非法模板名时抛出中文错误
 */
function normalizeTemplate(
  template: string | undefined,
): "default" | "minimal" {
  const value = template ?? "default";

  if (value !== "default" && value !== "minimal") {
    throw new Error(`非法模板「${value}」。可选：default | minimal`);
  }

  return value;
}

/**
 * 判断 create 选项是否已齐全（可跳过交互）。
 *
 * @param opts - 原始选项
 * @returns 齐全为 true
 */
function hasAllCreateFields(opts: RunCreateOptions): boolean {
  return Boolean(
    opts.dir?.trim() &&
      opts.appId?.trim() &&
      opts.title?.trim() &&
      (opts.template === "default" ||
        opts.template === "minimal" ||
        opts.template === undefined),
  );
}

/**
 * 执行 create：将 create-default / create-minimal 模板拷贝到目标目录。
 *
 * @param opts - 命令行选项；缺失字段会进入交互补全
 * @returns Promise<void>
 * @throws Error app-id 非法、目标非空且未 --force、模板拷贝失败时抛出
 *
 * @example
 * ```ts
 * await runCreate({
 *   dir: "./phone-app-demo-shop",
 *   template: "default",
 *   appId: "demo-shop",
 *   title: "演示商店",
 * });
 * ```
 */
export async function runCreate(opts: RunCreateOptions): Promise<void> {
  const appIdHint = opts.appId?.trim();

  if (appIdHint) {
    assertValidAppId(appIdHint);
  }

  const templateHint =
    opts.template === undefined
      ? undefined
      : normalizeTemplate(opts.template);

  const filled = hasAllCreateFields(opts)
    ? {
        dir: opts.dir!.trim(),
        template: normalizeTemplate(opts.template),
        appId: opts.appId!.trim(),
        title: opts.title!.trim(),
        force: opts.force ?? false,
      }
    : await promptCreateOptions({
        dir: opts.dir,
        template: templateHint,
        appId: opts.appId,
        title: opts.title,
        force: opts.force,
      });

  const template = normalizeTemplate(filled.template);
  const { appId, title, force } = filled;

  assertValidAppId(appId);

  const dest = resolve(filled.dir);

  if (isDirectoryNonEmpty(dest) && !force) {
    throw new Error(
      `目标目录非空：${dest}。若确认覆盖请添加 --force`,
    );
  }

  const pascalName = toPascalCase(appId);
  const registerFnName = toRegisterFnName(appId);
  const packageName = toPackageName(appId);
  const extensionId = toExtensionId(appId);
  const phoneSdkVersion = resolvePhoneSdkVersion();
  const author = "池水三两升";
  const date = todayDate();

  // title → JSX/MD/注释原文；titleJs → TS 双引号字面量；titleJson → extension.json
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

  // 注意：模板目录名为 create-default / create-minimal（不是 default）
  const templateName =
    template === "minimal" ? "create-minimal" : "create-default";
  const templateDir = join(TEMPLATES_DIR, templateName);
  const files = await copyTemplateDir(templateDir, dest, vars);

  console.log();
  console.log(pc.green("✔ 已创建独立内页扩展工程"));
  console.log(`  目录：${pc.cyan(dest)}`);
  console.log(`  模板：${pc.cyan(templateName)}`);
  console.log(`  应用：${pc.cyan(appId)}（${title}）`);
  console.log(`  文件：${files.length} 个`);
  console.log();
  console.log(pc.bold("下一步："));
  console.log(`  cd ${dest}`);
  console.log("  pnpm install");
  console.log("  pnpm build");
  console.log();
  console.log(
    `  在宿主设置中将 phoneAppId 配置为 ${pc.cyan(appId)} 后即可打开内页。`,
  );
  console.log();
}
