import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

async function fixture(installed: boolean, run: (api: typeof import("./constants.ts"), sdk: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "phone-sdk-dependency-"));
  const cli = installed ? join(root, "node_modules", "@ink-zenly", "create-phone-app") : join(root, "cli");
  const sdk = join(dirname(cli), "phone-sdk");
  try {
    mkdirSync(join(cli, "src"), { recursive: true });
    mkdirSync(sdk, { recursive: true });
    writeFileSync(join(cli, "package.json"), JSON.stringify({ type: "module", inkZenly: { phoneSdkVersion: "^0.6.0" } }));
    writeFileSync(join(sdk, "package.json"), JSON.stringify({ name: "@ink-zenly/phone-sdk", version: "0.5.28" }));
    if (!installed) writeFileSync(join(root, "phone-project.json"), JSON.stringify({ schemaVersion: 1 }));
    copyFileSync(new URL("./constants.ts", import.meta.url), join(cli, "src", "constants.ts"));
    const api = await import(pathToFileURL(join(cli, "src", "constants.ts")).href);
    run(api, sdk);
  } finally {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep));
    rmSync(root, { recursive: true, force: true });
  }
}

it("installed CLI uses its published SDK range even when another SDK is installed beside it", async () => {
  await fixture(true, (api) => {
    assert.equal(api.resolvePhoneSdkDependency(), "^0.6.0");
    assert.equal(api.resolvePhoneSdkVersion(), "^0.6.0");
  });
});

it("development checkout resolves its adjacent SDK source", async () => {
  await fixture(false, (api, sdk) => {
    assert.equal(api.resolvePhoneSdkDependency(), `file:${sdk.replace(/\\/g, "/")}`);
    assert.equal(api.resolvePhoneSdkVersion(), "^0.5.28");
  });
});

it("explicit SDK override takes priority in an installed CLI", async () => {
  await fixture(true, (api) => assert.equal(api.resolvePhoneSdkDependency("  0.6.1  "), "0.6.1"));
});
