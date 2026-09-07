import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CAPTURE_TEMP_SLOT } from "../constants";
import { chooseCaptureTempSlot } from "./capture-slot";

describe("chooseCaptureTempSlot", () => {
  it("uses the preferred slot when it is free", () => {
    assert.equal(chooseCaptureTempSlot([1, 2, 3]), CAPTURE_TEMP_SLOT);
  });

  it("never selects an occupied player slot", () => {
    assert.equal(
      chooseCaptureTempSlot([
        CAPTURE_TEMP_SLOT,
        CAPTURE_TEMP_SLOT + 1,
        CAPTURE_TEMP_SLOT + 3,
      ]),
      CAPTURE_TEMP_SLOT + 2,
    );
  });
});
