import { spawnSync } from "node:child_process";

/** 只运行固定的包管理器命令；不拼接作者输入到 shell。 */
export function runPackageCommand(cwd: string, action: "install" | "build"): void {
  const result = spawnSync("pnpm", [action], { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.error || result.status !== 0) {
    throw new Error(`pnpm ${action} 失败（${result.error?.message ?? `exit ${result.status}`}）：${cwd}`);
  }
}
