import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("album custom editor Chakra boundary", () => {
  it("does not render native form or layout elements in custom panes", () => {
    const source = readFileSync(
      new URL("./album-array-panels.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /<(?:div|span|button|input|select|option|label|textarea|section|header|nav)(?:\s|>)/,
    );
    assert.match(source, /chakra\.button/);
    assert.match(source, /<AssetUriField/);
  });
});
