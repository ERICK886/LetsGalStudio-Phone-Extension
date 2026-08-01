/**
 * @file pack.test.ts
 * @description runPack 校验路径单元测试（不含完整 install/build 集成）。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.0
 */

import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { runPack } from "./pack.ts";

describe("runPack", () => {
  it("无宿主根时抛出中文错误", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cpa-pack-"));

    await assert.rejects(
      () => runPack({ appId: "demo-shop", cwd: dir, force: true }),
      (err: unknown) => err instanceof Error && /宿主/.test(err.message),
    );
  });

  it("非交互且未指定 app-id 时抛出", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cpa-pack-"));
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(
      join(dir, "src", "index.tsx"),
      `import { definePhonePluginRegistry } from "x";\nexport {};\n`,
      "utf8",
    );

    await assert.rejects(
      () => runPack({ cwd: dir, force: true }),
      (err: unknown) =>
        err instanceof Error && /请指定 app-id/.test(err.message),
    );
  });

  it("宿主存在但缺少 src/<app-id> 时抛出", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cpa-pack-"));
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(
      join(dir, "src", "index.tsx"),
      `import { definePhonePluginRegistry } from "x";\nexport {};\n`,
      "utf8",
    );

    await assert.rejects(
      () => runPack({ appId: "missing-app", cwd: dir, force: true }),
      (err: unknown) =>
        err instanceof Error && /missing-app/.test(err.message),
    );
  });
});
