import { existsSync } from "node:fs";
/**
 * @file create.ts
 * @description `create-phone-app create`：脚手架手机宿主扩展工程（含首个内页）。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.2
 */

import { join, resolve } from "node:path";

import pc from "picocolors";

import { resolvePhoneSdkDependency, TEMPLATES_DIR } from "../constants.ts";
import { promptCreateOptions } from "../prompts.ts";
import {
  escapeForJsString,
  escapeForJsonString,
} from "../utils/escape.ts";
import { isDirectoryNonEmpty } from "../utils/fs.ts";
import {
  toPackageName,
  toPascalCase,
  toRegisterFnName,
} from "../utils/names.ts";
import { copyBundledAvgStudioSdk } from "../utils/sdk-bundle.ts";
import { copyTemplateDir } from "../utils/template.ts";
import {
  assertValidAppId,
  assertValidExtensionId,
} from "../utils/validate.ts";

/** create 命令入参（均可缺省，缺省走交互） */
export type RunCreateOptions = {
  dir?: string;
  template?: "default" | "minimal";
  /** 宿主扩展包 id → extension.json.id */
  extensionId?: string;
  /** 首个内页程序 id */
  appId?: string;
  title?: string;
  force?: boolean;
  kind?: "host" | "plugin";
  sdk?: string;
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
      opts.extensionId?.trim() &&
      opts.appId?.trim() &&
      opts.title?.trim() &&
      (opts.template === "default" ||
        opts.template === "minimal" ||
        opts.template === undefined),
  );
}

/**
 * 执行 create：拷贝 create-host-* 宿主骨架，再渲染 add 模板到 `src/<app-id>/`。
 *
 * @param opts - 命令行选项；缺失字段会进入交互补全
 * @returns Promise<void>
 * @throws Error id 非法、目标非空且未 --force、模板拷贝失败时抛出
 *
 * @example
 * ```ts
 * await runCreate({
 *   dir: "./my-phone",
 *   template: "default",
 *   extensionId: "com.acme.my-phone",
 *   appId: "demo-shop",
 *   title: "演示商店",
 * });
 * ```
 */
export async function runCreate(opts: RunCreateOptions): Promise<void> {
  if (opts.kind && opts.kind !== "host" && opts.kind !== "plugin") throw new Error("kind 必须是 host 或 plugin");
  const extensionIdHint = opts.extensionId?.trim();
  const appIdHint = opts.appId?.trim();

  if (extensionIdHint) {
    assertValidExtensionId(extensionIdHint);
  }

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
        extensionId: opts.extensionId!.trim(),
        appId: opts.appId!.trim(),
        title: opts.title!.trim(),
        force: opts.force ?? false,
      }
    : await promptCreateOptions({
        dir: opts.dir,
        template: templateHint,
        extensionId: opts.extensionId,
        appId: opts.appId,
        title: opts.title,
        force: opts.force,
      });

  const template = normalizeTemplate(filled.template);
  const { extensionId, appId, title, force } = filled;

  assertValidExtensionId(extensionId);
  assertValidAppId(appId);

  const dest = resolve(filled.dir);
  if (existsSync(join(dest, "extension.json")) || existsSync(join(dest, "phone-project.json"))) {
    throw new Error("目标已是扩展工程；请用 add 添加软件，不覆盖现有设置和控制器");
  }

  if (isDirectoryNonEmpty(dest) && !force) {
    throw new Error(
      `目标目录非空：${dest}。若确认覆盖请添加 --force`,
    );
  }

  const pascalName = toPascalCase(appId);
  const registerFnName = toRegisterFnName(appId);
  const packageName = toPackageName(extensionId);
  const phoneSdkVersion = resolvePhoneSdkDependency(opts.sdk);
  const author = "池水三两升";
  const date = todayDate();

  // title → JSX/MD/注释原文；titleJs → TS 双引号字面量；titleJson → extension.json
  const vars: Record<string, string> = {
    appId,
    projectKind: opts.kind ?? "host",
    hostExports: opts.kind === "plugin" ? "" : 'export { PhoneExtension, PhoneHudExtension, ToastExtension, default } from "@ink-zenly/phone-sdk/host";\nexport { PhoneEditorExtension } from "@ink-zenly/phone-sdk/editor";',
    title,
    titleJs: escapeForJsString(title),
    titleJson: escapeForJsonString(title),
    packageName,
    extensionId,
    phoneSdkVersion: escapeForJsonString(phoneSdkVersion),
    author,
    date,
    pascalName,
    registerFnName,
  };

  // 注意：模板目录名为 create-host-default / create-host-minimal（不是 default）
  const templateName =
    template === "minimal" ? "create-host-minimal" : "create-host-default";
  const hostTemplateDir = join(TEMPLATES_DIR, templateName);
  const addTemplateDir = join(TEMPLATES_DIR, "add");
  const appDest = join(dest, "src", "apps", appId);

  const hostFiles = await copyTemplateDir(hostTemplateDir, dest, vars);
  const appFiles = await copyTemplateDir(addTemplateDir, appDest, vars);
  const sdkFiles = await copyBundledAvgStudioSdk(dest);

  console.log();
  console.log(pc.green(`✔ 已创建手机${opts.kind === "plugin" ? "独立软件" : "宿主"}扩展工程`));
  console.log(`  目录：${pc.cyan(dest)}`);
  console.log(`  模板：${pc.cyan(templateName)}`);
  console.log(`  宿主扩展包 id：${pc.cyan(extensionId)}`);
  console.log(`  内页：${pc.cyan(`src/apps/${appId}/`)}（${title}）`);
  console.log(
    `  文件：${hostFiles.length + appFiles.length} 个（宿主 ${hostFiles.length} + 内页 ${appFiles.length}）`,
  );
  console.log(
    `  Studio SDK：已拷贝至 ${pc.cyan("sdk/")}（${sdkFiles.length} 个文件，dependencies 使用 file:./sdk）`,
  );
  console.log();
  console.log(pc.bold("下一步："));
  console.log(`  cd ${dest}`);
  console.log("  pnpm install");
  console.log();
  console.log(pc.bold("开发（含手机宿主）："));
  console.log("  pnpm watch");
  console.log("  # 宿主工程可独立启用；plugin 工程还需启用手机宿主");
  console.log();
  console.log(pc.bold("分发标准内页包："));
  console.log(`  create-phone-app pack ${appId}（使用与本次生成相同的 CLI）`);
  console.log("  # 产物在 ./release/<app-id>/；extension.json.id 默认等于 app-id");
  console.log();
}
