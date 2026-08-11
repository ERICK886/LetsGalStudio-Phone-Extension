/**
 * @file self-character.test.ts
 * @description 我方角色展示解析（空 ID 与角色资产路径）。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveSelfCharacterView } from "./self-character.ts";

function mockCtx(options?: {
  characters?: Record<string, { name?: string; avatarUri?: string } | undefined>;
}) {
  const characters = options?.characters ?? {};
  return {
    character: {
      get: (id: string) => characters[id],
    },
    asset: {
      resolve: (source: string) => ({ url: `resolved://${source}` }),
    },
  } as Parameters<typeof resolveSelfCharacterView>[0];
}

describe("resolveSelfCharacterView", () => {
  it("空 ID 返回默认「我」展示", () => {
    assert.deepEqual(resolveSelfCharacterView(mockCtx(), ""), {
      characterId: "",
      displayName: "我",
      glyph: "我",
      avatarUrl: undefined,
    });
    assert.deepEqual(resolveSelfCharacterView(mockCtx(), "   "), {
      characterId: "",
      displayName: "我",
      glyph: "我",
      avatarUrl: undefined,
    });
  });
});
