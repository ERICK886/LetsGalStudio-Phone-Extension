import { existsSync } from "node:fs";
import { join } from "node:path";
import { runDoctor } from "./doctor.ts";
import { runPackageCommand } from "../utils/run-command.ts";

/** 构建前检查软件结构；不会自动安装、启动 Studio 或发布。 */
export function runBuild(options: { cwd?: string }): void {
  const report = runDoctor(options);
  runPackageCommand(report.root, "build");
  if (!existsSync(join(report.root, "dist/index.mjs"))) throw new Error("构建未生成 dist/index.mjs");
}
