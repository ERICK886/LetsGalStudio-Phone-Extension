import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PHONE_VIEWPORT_DESIGN_SIZE,
  computePhoneViewportFit,
} from "./phone-viewport-fit.ts";

describe("computePhoneViewportFit", () => {
  it("keeps the Apple design size when the viewport has enough room", () => {
    assert.deepEqual(computePhoneViewportFit("apple", 1000, 1000), {
      scale: 1,
      width: 390,
      height: 780,
      designWidth: 390,
      designHeight: 780,
    });
  });

  it("uses viewport height as one uniform scale instead of squashing height", () => {
    const fit = computePhoneViewportFit("apple", 1000, 390);
    assert.equal(fit.scale, 0.5);
    assert.equal(fit.width, 195);
    assert.equal(fit.height, 390);
    assert.equal(fit.width / fit.height, 0.5);
  });

  it("can be limited by width and preserves the Android ratio", () => {
    const fit = computePhoneViewportFit("android", 200, 1000);
    assert.equal(fit.scale, 0.5);
    assert.equal(fit.width, 200);
    assert.equal(fit.height, 380);
    assert.equal(
      fit.width / fit.height,
      PHONE_VIEWPORT_DESIGN_SIZE.android.width / PHONE_VIEWPORT_DESIGN_SIZE.android.height,
    );
  });
});
