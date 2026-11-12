import { assertModuleExports } from "../utils/module-exports.ts";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { findHostRepoRoot } from "../utils/fs.ts";
import { collectPackageSources } from "../utils/package-sources.ts";
import { projectPath, readPhoneAppManifest, readPhoneProject } from "../utils/project.ts";
import { assertValidExtensionId } from "../utils/validate.ts";

export interface DoctorReport { root: string; apps: string[]; errors: string[]; warnings: string[] }

/** 只读检查项目、软件入口、依赖和分发准备，不修改作者设置。 */
export function inspectPhoneProject(cwd: string, release = false): DoctorReport {
  const root = findHostRepoRoot(cwd);
  if (!root) throw new Error("未找到手机工程");
  const report: DoctorReport = { root, apps: [], errors: [], warnings: [] };
  const check = (run: () => void) => { try { run(); } catch (error) { report.errors.push(error instanceof Error ? error.message : String(error)); } };
  check(() => {
    const project = readPhoneProject(root);
    const extension = JSON.parse(readFileSync(join(root, "extension.json"), "utf8"));
    assertValidExtensionId(extension.id);
    for (const path of ["src/index.tsx", project.registry, "package.json", "vite.config.ts"]) {
      if (!existsSync(projectPath(root, path))) report.errors.push(`缺少 ${path}`);
    }
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const appsDir = projectPath(root, project.appsDir);
    for (const entry of readdirSync(appsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const appDir = join(appsDir, entry.name);
      if (!existsSync(join(appDir, "phone-app.json"))) {
        if (existsSync(join(appDir, "index.tsx"))) report.warnings.push(`${entry.name} 缺少 phone-app.json，打包前须声明真实控制器`);
        continue;
      }
      check(() => {
        const manifest = readPhoneAppManifest(appDir, entry.name);
        const sources = collectPackageSources(root, appDir);
        assertModuleExports(join(root, "src/index.tsx"), manifest.controller.exports);
        for (const name of sources.dependencies) {
          if (!pkg.dependencies?.[name] && !pkg.peerDependencies?.[name] && !pkg.devDependencies?.[name]) report.errors.push(`${manifest.id} 使用未声明的依赖：${name}`);
        }
        report.apps.push(manifest.id);
      });
    }
    if (!report.apps.length) report.errors.push("未找到可打包的软件描述");
    const dependency = pkg.dependencies?.["@ink-zenly/phone-sdk"];
    if (!dependency) report.errors.push("未声明 @ink-zenly/phone-sdk 依赖");
    if (release && /^(file:|link:|workspace:)/.test(dependency ?? "")) report.errors.push("发布前须将本地 phone-sdk 依赖换为已发布且经过验证的版本");
    if (release && !existsSync(join(root, "dist/index.mjs"))) report.errors.push("发布前须构建 dist/index.mjs");
    if (existsSync(join(root, "node_modules"))) {
      check(() => {
        const require = createRequire(join(root, "package.json"));
        for (const subpath of ["plugin", "host", "editor"]) require.resolve(`@ink-zenly/phone-sdk/${subpath}`);
      });
    } else report.warnings.push("尚未安装依赖，未验证实际 SDK 入口和构建");
  });
  return report;
}

export function runDoctor(options: { cwd?: string; release?: boolean; json?: boolean }): DoctorReport {
  const report = inspectPhoneProject(options.cwd ?? process.cwd(), options.release);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`工程：${report.root}\n软件：${report.apps.join(", ")}`);
    for (const warning of report.warnings) console.warn(`提示：${warning}`);
    for (const error of report.errors) console.error(`错误：${error}`);
  }
  if (report.errors.length) throw new Error(`检查未通过：${report.errors.length} 项错误`);
  return report;
}
