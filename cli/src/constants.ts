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
