/**
 * @file template.ts
 * @description 模板字符串渲染与模板目录递归拷贝。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { extname, join, relative } from "node:path";

/** 拷贝时跳过的目录名 */
const SKIP_DIR_NAMES = new Set([".git", "node_modules"]);

/** 需做 {{var}} 文本替换的扩展名 */
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".css",
  ".html",
  ".js",
  ".mjs",
]);

/**
 * 将 `input` 中 `{{key}}` 占位符替换为 `vars[key]`。
 *
 * @param input - 含 `{{var}}` 占位符的字符串
 * @param vars - 键值对；未提供的占位符保持原样
 * @returns 替换后的字符串
 *
 * @example
 * ```ts
 * renderTemplateString("{{appId}}-{{title}}", { appId: "a", title: "T" });
 * // => "a-T"
 * ```
 */
export function renderTemplateString(
  input: string,
  vars: Record<string, string>,
): string {
  return input.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : match;
  });
}

/**
 * 判断文件是否应按文本模板处理。
 *
 * @param filePath - 文件路径（含扩展名）
 * @returns 文本扩展名则 true
 */
function isTextTemplateFile(filePath: string): boolean {
  return TEXT_EXTENSIONS.has(extname(filePath).toLowerCase());
}

/**
 * 递归拷贝模板目录到目标目录，并替换文本内容与目标文件名中的占位符。
 *
 * @param srcDir - 模板源目录绝对路径
 * @param destDir - 目标目录绝对路径
 * @param vars - 模板变量
 * @returns 已写入文件的相对路径列表（相对 `destDir`）
 * @throws 读取/写入失败时由 Node fs 抛出
 *
 * @example
 * ```ts
 * const files = await copyTemplateDir("/tpl", "/out", { appId: "demo-shop" });
 * ```
 */
export async function copyTemplateDir(
  srcDir: string,
  destDir: string,
  vars: Record<string, string>,
): Promise<string[]> {
  const written: string[] = [];

  function walk(currentSrc: string, currentDest: string): void {
    for (const entry of readdirSync(currentSrc, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }

        const nextSrc = join(currentSrc, entry.name);
        const nextDestName = renderTemplateString(entry.name, vars);
        const nextDest = join(currentDest, nextDestName);
        mkdirSync(nextDest, { recursive: true });
        walk(nextSrc, nextDest);
        continue;
      }

      const srcPath = join(currentSrc, entry.name);
      const destName = renderTemplateString(entry.name, vars);

      /**
       * npm pack 不会稳定带上包内模板的 `.gitignore`；模板提交为 `gitignore`，
       * 生成工程时改回 `.gitignore`。
       */
      const resolvedDestName =
        destName === "gitignore" ? ".gitignore" : destName;

      const destPath = join(currentDest, resolvedDestName);
      const relPath = relative(destDir, destPath).replace(/\\/g, "/");

      mkdirSync(currentDest, { recursive: true });

      if (isTextTemplateFile(srcPath)) {
        const content = readFileSync(srcPath, "utf8");
        writeFileSync(destPath, renderTemplateString(content, vars), "utf8");
      } else {
        copyFileSync(srcPath, destPath);
      }

      written.push(relPath);
    }
  }

  mkdirSync(destDir, { recursive: true });
  walk(srcDir, destDir);

  return written;
}
