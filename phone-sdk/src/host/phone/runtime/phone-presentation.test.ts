import assert from "node:assert/strict";
import { it } from "node:test";
import { createPhonePresentation } from "./phone-presentation.ts";

it("docking preserves the instance and independent Preview lifetimes", () => {
  const first = createPhonePresentation("docked");
  const second = createPhonePresentation("docked");
  const seen: string[] = [];
  const unsubscribe = first.subscribe(() => seen.push(first.getSnapshot()));
  first.set("open"); first.set("open"); first.set("closing"); first.set("docked"); first.set("open");
  assert.deepEqual(seen, ["open", "closing", "docked", "open"]);
  assert.equal(second.getSnapshot(), "docked");
  unsubscribe(); first.set("docked");
  assert.equal(seen.length, 4);
});

it("starts without motion and supports immediate docking before the next animated opening", () => {
  const phone = createPhonePresentation("docked");
  assert.equal(phone.shouldAnimate(), false);
  phone.set("open");
  assert.equal(phone.shouldAnimate(), true);
  phone.set("docked", false);
  assert.equal(phone.shouldAnimate(), false);
  phone.set("open");
  assert.equal(phone.shouldAnimate(), true);
});
