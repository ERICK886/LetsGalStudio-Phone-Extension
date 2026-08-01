/**
 * @file constants.ts
 * @description CLI 常量：模板路径、phone-sdk 版本解析。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.1
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** CLI 包根目录（cli/） */
export const CLI_ROOT = join(__dirname, "..");

/** 模板根目录 */
export const TEMPLATES_DIR = join(CLI_ROOT, "templates");

/**
 * 解析脚手架应写入的 `@ink-zenly/phone-sdk` npm 版本范围。
 *
 * 查找顺序：
 * 1. 本仓 monorepo：`../phone-sdk/package.json` 的 `version`（开发态）
 * 2. 本 CLI 包 `package.json` 的 `inkZenly.phoneSdkVersion`（发布态兜底）
 *
 * @returns 形如 `^0.3.1` 的版本字符串
 * @throws 所有来源均不可用时抛出中文 Error
 *
 * @example
 * ```ts
 * resolvePhoneSdkVersion(); // "^0.3.1"
 * ```
 */
export function resolvePhoneSdkVersion(): string {
  const monorepoPkg = join(CLI_ROOT, "..", "phone-sdk", "package.json");

  if (existsSync(monorepoPkg)) {
    try {
      const pkg = JSON.parse(readFileSync(monorepoPkg, "utf8")) as {
        version?: string;
      };

      if (pkg.version) {
        return `^${pkg.version}`;
      }
    } catch {
      // 继续尝试 CLI 包内兜底配置
    }
  }

  const cliPkgPath = join(CLI_ROOT, "package.json");

  try {
    const cliPkg = JSON.parse(readFileSync(cliPkgPath, "utf8")) as {
      inkZenly?: { phoneSdkVersion?: string };
    };
    const pinned = cliPkg.inkZenly?.phoneSdkVersion?.trim();

    if (pinned) {
      return pinned;
    }
  } catch {
    // fall through
  }

  throw new Error(
    "无法解析 @ink-zenly/phone-sdk 版本：既不在 monorepo（缺少 ../phone-sdk/package.json），" +
      "CLI package.json 也未配置 inkZenly.phoneSdkVersion",
  );
}
