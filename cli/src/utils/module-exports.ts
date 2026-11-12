import { readFileSync } from "node:fs";
import ts from "typescript";

/** 静态检查显式导出，不求值作者代码。复杂 export * 结构交给实际构建验证。 */
export function assertModuleExports(path: string, names: readonly string[]): void {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const exported = new Set<string>();
  let hasStar = false;
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (!statement.exportClause) hasStar = true;
      else if (ts.isNamedExports(statement.exportClause)) for (const item of statement.exportClause.elements) exported.add(item.name.text);
    }
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (!modifiers?.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if ((ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)) && statement.name) exported.add(statement.name.text);
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) exported.add(declaration.name.text);
    }
  }
  for (const name of names) if (!exported.has(name) && !hasStar) throw new Error(`入口缺少导出 ${name}：${path}`);
}
