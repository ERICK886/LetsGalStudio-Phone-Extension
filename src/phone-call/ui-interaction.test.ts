import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("phone call incoming interaction contract", () => {
  const source = readFileSync(new URL("./ui.tsx", import.meta.url), "utf8");

  it("keeps answer and decline as non-submit interactive buttons", () => {
    assert.match(
      source,
      /<button type="button" className="pc-action pc-decline" \{\.\.\.buttonHandlers\("decline"\)\}/,
    );
    assert.match(
      source,
      /<button type="button" className="pc-action pc-answer" \{\.\.\.buttonHandlers\("answer"\)\}/,
    );
    assert.match(source, /pointer-events:auto!important/);
    assert.match(source, /ui-button-\$\{phase\}/);
    assert.match(source, /resolveChoice\(choice,"pointerup"\)/);
    assert.match(source, /resolveChoice\(choice,"click"\)/);
    assert.match(source, /ui-window-pointerdown/);
    assert.match(source, /if\(handled\)handledIncomingSession\.current=incoming\.id/);
  });
});
