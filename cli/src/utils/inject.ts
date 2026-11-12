import ts from "typescript";
import { toPascalCase, toRegisterFnName } from "./names.ts";

/** 只修改语法树定位到的注册列表，保留注释、尾逗号和其它源码。 */
export function injectPhoneAppRegistry(source: string, appId: string, appPath = `./${appId}`): string {
  const diagnostics = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.Preserve } }).diagnostics;
  if (diagnostics?.some((item) => item.category === ts.DiagnosticCategory.Error)) throw new Error("注册入口存在语法错误，无法安全注入");
  const fn = toRegisterFnName(appId);
  const file = ts.createSourceFile("registry.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const candidates: Array<ts.CallExpression | ts.ArrayLiteralExpression> = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "definePhonePluginRegistry") candidates.push(node);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "phoneApps" &&
        node.initializer && ts.isArrayLiteralExpression(node.initializer)) candidates.push(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (candidates.length !== 1) throw new Error("须有且只有一个 phoneApps 数组或 definePhonePluginRegistry 调用，无法安全注入");
  const target = candidates[0]!;
  const elements = ts.isCallExpression(target) ? target.arguments : target.elements;
  const imports = file.statements.filter(ts.isImportDeclaration);
  const existingImport = imports.find((item) => ts.isStringLiteral(item.moduleSpecifier) && item.moduleSpecifier.text === appPath);
  const bindings = existingImport?.importClause?.namedBindings;
  const hasBinding = bindings && ts.isNamedImports(bindings) && bindings.elements.some((item) =>
    item.name.text === fn && (!item.propertyName || item.propertyName.text === fn));
  if (existingImport && !hasBinding) throw new Error(`已有 ${appPath} 导入但缺少 ${fn}，请手动合并导入`);
  if (!hasBinding && imports.some((item) => {
    const named = item.importClause?.namedBindings;
    return named && ts.isNamedImports(named) && named.elements.some((binding) => binding.name.text === fn);
  })) throw new Error(`注册函数名 ${fn} 与既有导入冲突`);
  const edits: Array<{ at: number; text: string }> = [];
  if (!elements.some((item) => ts.isIdentifier(item) && item.text === fn)) {
    const at = elements.length ? elements[elements.length - 1]!.end :
      ts.isCallExpression(target) ? target.expression.end + source.slice(target.expression.end, target.end).indexOf("(") + 1 : target.getStart(file) + 1;
    edits.push({ at, text: elements.length ? `, ${fn}` : fn });
  }
  if (!hasBinding) {
    edits.push({ at: imports.at(-1)?.end ?? 0, text: `\nimport { ${fn} } from ${JSON.stringify(appPath)};\n` });
  }
  for (const edit of edits.sort((a, b) => b.at - a.at)) source = source.slice(0, edit.at) + edit.text + source.slice(edit.at);
  return source;
}

/** 新脚手架的软件控制器也必须暴露给 Studio。 */
export function injectPhoneAppController(source: string, appId: string, appPath: string): string {
  const name = `${toPascalCase(appId)}Controller`;
  const statement = `export { ${name} } from ${JSON.stringify(appPath)};`;
  if (source.includes(statement)) return source;
  return `${source.trimEnd()}\n${statement}\n`;
}
