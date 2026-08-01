/**
 * @file fs.ts
 * @description 宿主仓库根目录探测与目录非空判断。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** 宿主入口相对路径 */
const HOST_INDEX_REL = join("src", "index.tsx");

/** 宿主入口必须包含的注册 API 标识 */
const HOST_REGISTRY_MARKER = "definePhonePluginRegistry";

/**
 * 判断目录是否存在且至少含一项条目。
 *
 * @param dir - 待检测目录路径
 * @returns 存在且非空为 true；不存在或空目录为 false
 *
 * @example
 * ```ts
 * isDirectoryNonEmpty("./empty"); // false
 * ```
 */
export function isDirectoryNonEmpty(dir: string): boolean {
  if (!existsSync(dir)) {
    return false;
  }

  try {
    return readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

/**
 * 从 `startDir` 向上逐级查找 LetsGal 手机扩展宿主仓库根。
 *
 * 命中条件：存在 `src/index.tsx` 且文件内容包含 `definePhonePluginRegistry`。
 *
 * @param startDir - 起始目录（通常为 cwd 或 CLI 所在路径）
 * @returns 仓库根绝对路径；未找到则 null
 *
 * @example
 * ```ts
 * const root = findHostRepoRoot(process.cwd());
 * ```
 */
export function findHostRepoRoot(startDir: string): string | null {
  let dir = resolve(startDir);

  while (true) {
    const indexPath = join(dir, HOST_INDEX_REL);

    if (existsSync(indexPath)) {
      try {
        const content = readFileSync(indexPath, "utf8");
        if (content.includes(HOST_REGISTRY_MARKER)) {
          return dir;
        }
      } catch {
        // 无法读取则继续向上
      }
    }

    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }

    dir = parent;
  }

  return null;
}
