import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { it } from "node:test";
import ts from "typescript";
import { runCreate } from "./create.ts";

for (const template of ["default", "minimal"] as const) {
  it(`${template} generates all four host modules and registers its app`, async () => {
    const root = mkdtempSync(join(tmpdir(), "phone-host-contract-"));
    try {
      await runCreate({ dir: root, template, extensionId: "test.phone", appId: "test-shop", title: "Test" });
      const entry = readFileSync(join(root, "src/index.tsx"), "utf8");
      const tree = ts.createSourceFile("index.tsx", entry, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const names = tree.statements.flatMap((statement) =>
        ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)
          ? statement.exportClause.elements.map((element) => element.name.text) : []);
      for (const name of ["PhoneExtension", "PhoneHudExtension", "ToastExtension", "PhoneEditorExtension"]) {
        assert.ok(names.includes(name), `Missing ${name}`);
      }
      assert.match(entry, /bootstrapPhonePluginApps\(definePhonePluginRegistry\(/);
      assert.match(readFileSync(join(root, "src/test-shop/index.tsx"), "utf8"), /registerPhoneApp\(/);
    } finally {
      assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep));
      rmSync(root, { recursive: true, force: true });
    }
  });
}
