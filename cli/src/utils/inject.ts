/**
 * @file inject.ts
 * @description 向宿主 `src/index.tsx` 注入 Phone App 注册 import 与 registry 参数。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { toRegisterFnName } from "./names.ts";

/** 匹配单行相对路径 import，用于定位插入锚点。 */
const RELATIVE_IMPORT_RE = /^import .+ from ["']\.\/.+["'];?\s*$/gm;

/**
 * 在宿主入口源码中注入 Phone App 的 import 与 `definePhonePluginRegistry` 注册项。
 *
 * @param source - 宿主 `src/index.tsx` 全文
 * @param appId - 应用 ID，如 `notes`
 * @returns 注入后的完整源码
 * @throws {Error} 未找到 `definePhonePluginRegistry` 或相对 import 锚点时抛出中文说明
 *
 * @example
 * ```ts
 * const next = injectPhoneAppRegistry(indexSource, "notes");
 * // 追加 import { registerNotesPhoneApp } from "./notes";
 * // registry 内追加 registerNotesPhoneApp
 * ```
 */
export function injectPhoneAppRegistry(source: string, appId: string): string {
  const fn = toRegisterFnName(appId);
  const rel = `./${appId}`;

  if (!source.includes("definePhonePluginRegistry")) {
    throw new Error(
      "未找到 definePhonePluginRegistry，无法注入 Phone App 注册表",
    );
  }

  const hasRelImport =
    source.includes(`from "${rel}"`) || source.includes(`from '${rel}'`);
  const hasFnImport = new RegExp(
    `import\\s*\\{[^}]*\\b${fn}\\b[^}]*\\}`,
  ).test(source);

  const needsImport = !hasRelImport && !hasFnImport;

  if (needsImport) {
    const matches = [...source.matchAll(RELATIVE_IMPORT_RE)];
    if (matches.length === 0) {
      throw new Error(
        "未找到相对路径 import 锚点，无法插入 Phone App 导入",
      );
    }
  }

  let result = source;

  if (needsImport) {
    const matches = [...source.matchAll(RELATIVE_IMPORT_RE)];
    const lastMatch = matches[matches.length - 1]!;
    const insertPos = lastMatch.index! + lastMatch[0].length;
    const importLine = `\nimport { ${fn} } from "${rel}";`;

    result = result.slice(0, insertPos) + importLine + result.slice(insertPos);
  }

  const registryMarker = "definePhonePluginRegistry(";
  const markerIndex = result.indexOf(registryMarker);

  if (markerIndex === -1) {
    throw new Error(
      "未找到 definePhonePluginRegistry，无法注入 Phone App 注册表",
    );
  }

  const argsStart = markerIndex + registryMarker.length;
  let depth = 1;
  let i = argsStart;

  while (i < result.length && depth > 0) {
    const ch = result[i];
    if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth--;
    }
    i++;
  }

  if (depth !== 0) {
    throw new Error(
      "definePhonePluginRegistry 括号未闭合，无法注入 Phone App 注册表",
    );
  }

  const argsEnd = i - 1;
  const argsContent = result.slice(argsStart, argsEnd);
  const fnPresent = new RegExp(`\\b${fn}\\b`).test(argsContent);

  if (!fnPresent) {
    const trimmed = argsContent.trim();
    const insertion = trimmed.length === 0 ? fn : `, ${fn}`;

    result = result.slice(0, argsEnd) + insertion + result.slice(argsEnd);
  }

  return result;
}
