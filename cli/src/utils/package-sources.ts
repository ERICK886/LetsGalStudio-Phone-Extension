import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { projectPath } from "./project.ts";

/** 收集软件与显式相对依赖，不复制其它应用目录或开发工具。 */
export function collectPackageSources(root: string, appDir: string): { files: string[]; dependencies: string[] } {
  const files = new Set<string>();
  const dependencies = new Set<string>();
  const sourceRoot = join(root, "src");
  const visit = (path: string) => {
    projectPath(sourceRoot, relative(sourceRoot, path));
    if (files.has(path)) return;
    files.add(path);
    if (!/\.[cm]?[jt]sx?$/.test(path)) return;
    const text = readFileSync(path, "utf8");
    const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    const imports: string[] = [];
    const scan = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
      ts.forEachChild(node, scan);
    };
    scan(file);
    for (const specifier of imports) {
      if (!specifier.startsWith(".")) {
        if (specifier.startsWith("node:")) throw new Error(`手机软件不能依赖 Node 运行模块：${specifier}`);
        dependencies.add(specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0]!);
        continue;
      }
      const base = resolve(dirname(path), specifier.split("?")[0]!);
      const candidates = [base, ...[".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"].map((suffix) => base + suffix)];
      const target = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
      if (!target) throw new Error(`相对依赖不存在：${relative(root, path)} -> ${specifier}`);
      visit(target);
    }
  };
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".git", "dist"].includes(entry.name) || /\.test\.[jt]sx?$/.test(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`软件目录包含符号链接，请显式整理依赖：${path}`);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) visit(path);
    }
  };
  walk(appDir);
  return { files: [...files], dependencies: [...dependencies].sort() };
}
