import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep, isAbsolute } from "node:path";
import { resolvePhoneSdkDependency, TEMPLATES_DIR } from "../constants.ts";
import { promptPackAppId } from "../prompts.ts";
import { escapeForJsString, escapeForJsonString } from "../utils/escape.ts";
import { findHostRepoRoot, isDirectoryNonEmpty } from "../utils/fs.ts";
import { toPackageName } from "../utils/names.ts";
import { collectPackageSources } from "../utils/package-sources.ts";
import { projectPath, readPhoneAppManifest, readPhoneProject } from "../utils/project.ts";
import { runPackageCommand } from "../utils/run-command.ts";
import { copyBundledAvgStudioSdk } from "../utils/sdk-bundle.ts";
import { copyTemplateDir } from "../utils/template.ts";
import { assertValidAppId, assertValidExtensionId } from "../utils/validate.ts";

export type RunPackOptions = {
  appId?: string; cwd?: string; out?: string; force?: boolean;
  title?: string; extensionId?: string; sdk?: string;
  /** 仅生成可审阅源码，不安装、不构建。 */
  prepare?: boolean;
  /** 使用已有依赖构建。 */
  skipInstall?: boolean;
};

function isWithin(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return !isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`);
}

/** 输出不能覆盖工程、源码、SDK、依赖或配置；force 也不能绕过。 */
export function assertPackOutput(root: string, out: string, force: boolean, appId: string): void {
  const canonical = (target: string): string => {
    if (existsSync(target)) return realpathSync(target);
    const parent = dirname(target);
    if (parent === target) return target;
    return resolve(canonical(parent), relative(parent, target));
  };
  root = canonical(root);
  out = canonical(out);
  if (isWithin(out, root) || ["src", "phone-sdk", "cli", "sdk", "node_modules", ".git"].some((dir) => isWithin(join(root, dir), out))) {
    throw new Error(`输出目录会覆盖源码或工程：${out}`);
  }
  if (isDirectoryNonEmpty(out)) {
    const marker = join(out, "phone-package.json");
    if (!force || !existsSync(marker) || JSON.parse(readFileSync(marker, "utf8")).appId !== appId) {
      throw new Error(`目标目录非空：${out}；仅同一应用的 CLI 产物允许 --force 覆盖`);
    }
  }
}

export async function runPack(opts: RunPackOptions): Promise<void> {
  const root = findHostRepoRoot(opts.cwd ?? process.cwd());
  if (!root) throw new Error("未找到手机宿主或独立软件工程");
  let appId = opts.appId?.trim();
  if (!appId) {
    if (!process.stdout.isTTY) throw new Error("请指定 app-id");
    appId = await promptPackAppId(root);
  }
  assertValidAppId(appId);
  const project = readPhoneProject(root);
  const appDir = projectPath(root, `${project.appsDir}/${appId}`);
  if (!existsSync(appDir)) throw new Error(`未找到内页目录：${project.appsDir}/${appId}`);
  const manifest = readPhoneAppManifest(appDir, appId);
  const sources = collectPackageSources(root, appDir);
  const extensionId = opts.extensionId?.trim() || appId;
  assertValidExtensionId(extensionId);
  const out = resolve(root, opts.out?.trim() || `release/${appId}`);
  assertPackOutput(root, out, opts.force ?? false, appId);
  const sourcePackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>; peerDependencies?: Record<string, string>;
  };
  const extraDependencies: Record<string, string> = {};
  for (const name of sources.dependencies) {
    if (["react", "react-dom", "@avg-studio/sdk", "@ink-zenly/phone-sdk"].includes(name)) continue;
    const version = sourcePackage.dependencies?.[name] ?? sourcePackage.peerDependencies?.[name];
    if (!version || /^(file:|link:|workspace:)/.test(version)) throw new Error(`应用依赖 ${name} 缺少可分发的版本声明`);
    extraDependencies[name] = version;
  }
  const title = opts.title?.trim() || appId;
  const appRelative = relative(join(root, "src"), appDir).replace(/\\/g, "/");
  const modulePath = (entry: string) => `./${appRelative}/${entry.replace(/\.[cm]?[jt]sx?$/, "")}`;
  await copyTemplateDir(join(TEMPLATES_DIR, "pack-release"), out, {
    appId, title, titleJs: escapeForJsString(title), titleJson: escapeForJsonString(title),
    extensionId, packageName: toPackageName(extensionId), phoneSdkVersion: escapeForJsonString(resolvePhoneSdkDependency(opts.sdk)),
    registerFnName: manifest.registration.export, registrationImport: modulePath(manifest.registration.entry),
    controllerExports: manifest.controller.exports.join(", "), controllerImport: modulePath(manifest.controller.entry),
    author: "", date: new Date().toISOString().slice(0, 10),
  });
  for (const file of sources.files) {
    const dest = projectPath(out, relative(root, file));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
  }
  await copyBundledAvgStudioSdk(out);
  const packagePath = join(out, "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  Object.assign(pkg.dependencies, extraDependencies);
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  writeFileSync(join(out, "phone-project.json"), JSON.stringify({ ...project, kind: "plugin", registry: "src/index.tsx" }, null, 2) + "\n");
  writeFileSync(join(out, "phone-package.json"), JSON.stringify({ schemaVersion: 1, appId, extensionId, sourceFiles: sources.files.map((file) => relative(root, file).replace(/\\/g, "/")) }, null, 2) + "\n");
  if (!opts.prepare) {
    if (!opts.skipInstall) runPackageCommand(out, "install");
    runPackageCommand(out, "build");
    if (!existsSync(join(out, "dist/index.mjs"))) throw new Error("构建未生成 dist/index.mjs");
  }
  console.log(`已${opts.prepare ? "准备源码" : "构建独立软件"}：${out}`);
  console.log(`手机桌面引用：${extensionId}/${appId}。设置/存档控制器已原样保留，未上传或发布。`);
}
