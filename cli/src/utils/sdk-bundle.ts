/**
 * @file sdk-bundle.ts
 * @description 脚手架捆绑的 `@avg-studio/sdk`：解析源目录并拷贝到目标工程 `sdk/`。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CLI_ROOT } from "../constants.ts";
import { copyTemplateDir } from "./template.ts";

/**
 * 解析 CLI 捆绑的 `@avg-studio/sdk` 源目录。
 *
 * 查找顺序：
 * 1. `cli/vendor/avg-studio-sdk`（发布包 / 已同步 vendor）
 * 2. 本仓 monorepo `../sdk`（本地开发未同步 vendor 时的回退）
 *
 * @returns sdk 根目录绝对路径；均不存在则 null
 *
 * @example
 * ```ts
 * const dir = resolveBundledAvgStudioSdkDir();
 * ```
 */
export function resolveBundledAvgStudioSdkDir(): string | null {
  const candidates = [
    join(CLI_ROOT, "vendor", "avg-studio-sdk"),
    join(CLI_ROOT, "..", "sdk"),
  ];

  for (const dir of candidates) {
    const pkgPath = join(dir, "package.json");

    if (!existsSync(pkgPath)) {
      continue;
    }

    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };

      if (pkg.name === "@avg-studio/sdk") {
        return dir;
      }
    } catch {
      // 尝试下一个候选
    }
  }

  return null;
}

/**
 * 将捆绑的 `@avg-studio/sdk` 拷贝到 `destRoot/sdk`。
 *
 * 使用 `copyTemplateDir` 做递归拷贝（跳过 `.git` / `node_modules`）；
 * 不传入占位符，避免误改 sdk 源码中的花括号文本。
 *
 * @param destRoot - 脚手架目标工程根目录
 * @returns 已写入文件的相对路径列表（相对 `destRoot/sdk`）
 * @throws 找不到捆绑 sdk 时抛出中文 Error；拷贝失败时由 fs 抛出
 *
 * @example
 * ```ts
 * await copyBundledAvgStudioSdk("/path/to/my-shop");
 * // => 生成 /path/to/my-shop/sdk/**
 * ```
 */
export async function copyBundledAvgStudioSdk(
  destRoot: string,
): Promise<string[]> {
  const src = resolveBundledAvgStudioSdkDir();

  if (!src) {
    throw new Error(
      "脚手架未捆绑 @avg-studio/sdk：缺少 cli/vendor/avg-studio-sdk（或本仓 ../sdk）",
    );
  }

  const destSdk = join(destRoot, "sdk");

  return copyTemplateDir(src, destSdk, {});
}
