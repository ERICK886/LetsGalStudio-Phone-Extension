import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { it } from "node:test";
import ts from "typescript";
import { runCreate } from "./create.ts";
import { runAdd } from "./add.ts";
import { runPack } from "./pack.ts";
import { inspectPhoneProject } from "./doctor.ts";
import { injectPhoneAppRegistry } from "../utils/inject.ts";

it("独立软件生成、添加、打包保留原控制器中的设置/存档/方法", async () => {
  const root = mkdtempSync(join(tmpdir(), "phone-workflow-"));
  await runCreate({ dir: root, kind: "plugin", extensionId: "test.independent", appId: "notes", title: "便签" });
  assert.doesNotMatch(readFileSync(join(root, "src/index.tsx"), "utf8"), /PhoneExtension|PhoneEditorExtension/);
  const appPath = join(root, "src/apps/notes/index.tsx");
  const source = readFileSync(appPath, "utf8").replace("extends Extension {", 'extends Extension {\n  static settings = { title: "既有标题" };\n  static saveSchema = { entries: [] };\n  static customMethod = "keep";');
  writeFileSync(appPath, source);
  await runAdd({ cwd: root, appId: "todo", title: "待办" });
  assert.match(readFileSync(join(root, "src/index.tsx"), "utf8"), /TodoController/);
  assert.deepEqual(inspectPhoneProject(root).apps.sort(), ["notes", "todo"]);
  await runPack({ cwd: root, appId: "notes", extensionId: "test.notes", prepare: true });
  const output = join(root, "release/notes");
  assert.equal(readFileSync(join(output, "src/apps/notes/index.tsx"), "utf8"), source);
  assert.match(readFileSync(join(output, "src/index.tsx"), "utf8"), /export \{ NotesController \} from/);
  assert.equal(existsSync(join(output, "src/apps/todo")), false);
  assert.ok(inspectPhoneProject(root, true).errors.some((error) => error.includes("发布")));
  for (const out of [".", "src", "src/apps/notes", "sdk"]) {
    await assert.rejects(() => runPack({ cwd: root, appId: "notes", out, force: true, prepare: true }), /覆盖/);
  }
  assert.equal(readFileSync(appPath, "utf8"), source);
});

it("注入失败发生在生成软件目录前；旧清单的尾逗号和括号注释不损坏源码", async () => {
  const root = mkdtempSync(join(tmpdir(), "phone-inject-"));
  await runCreate({ dir: root, extensionId: "test.host", appId: "notes", title: "便签" });
  writeFileSync(join(root, "src/phone-apps.ts"), "export {};\n");
  await assert.rejects(() => runAdd({ cwd: root, appId: "todo", title: "待办" }), /无法安全注入/);
  assert.equal(existsSync(join(root, "src/apps/todo")), false);
  const source = 'import { registerNotesPhoneApp } from "./notes";\ndefinePhonePluginRegistry(\nregisterNotesPhoneApp, // ) 保留尾逗号\n);';
  const next = injectPhoneAppRegistry(source, "todo");
  const result = ts.transpileModule(next, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  assert.deepEqual(result.diagnostics, []);
  assert.match(next, /\) 保留尾逗号/);
  assert.equal(injectPhoneAppRegistry(next, "todo"), next);
});
