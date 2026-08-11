/**
 * @file enum-select-utils.test.ts
 * @description EnumSelect 纯逻辑单测。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterEnumOptions,
  mergeOrphanOption,
  resolveEnumLabel,
} from "./enum-select-utils.ts";

const OPTS = [
  { value: "apple", label: "苹果风" },
  { value: "android", label: "安卓风" },
];

describe("filterEnumOptions", () => {
  it("空查询返回全部", () => {
    assert.equal(filterEnumOptions(OPTS, "").length, 2);
  });
  it("按 label 不区分大小写过滤", () => {
    assert.deepEqual(filterEnumOptions(OPTS, "安卓"), [
      { value: "android", label: "安卓风" },
    ]);
  });
  it("按 value 过滤", () => {
    assert.equal(filterEnumOptions(OPTS, "APPLE").length, 1);
  });
});

describe("mergeOrphanOption", () => {
  it("值在列表中不追加", () => {
    assert.equal(mergeOrphanOption(OPTS, "apple").length, 2);
  });
  it("orphan 值追加一项", () => {
    const merged = mergeOrphanOption(OPTS, "legacy-id");
    assert.equal(merged.length, 3);
    assert.equal(merged[0]?.value, "legacy-id");
  });
  it("空 value 不追加", () => {
    assert.equal(mergeOrphanOption(OPTS, "").length, 2);
  });
});

describe("resolveEnumLabel", () => {
  it("命中返回 label", () => {
    assert.equal(resolveEnumLabel(OPTS, "apple"), "苹果风");
  });
  it("未命中返回原 value", () => {
    assert.equal(resolveEnumLabel(OPTS, "x"), "x");
  });
  it("空值返回 placeholder", () => {
    assert.equal(resolveEnumLabel(OPTS, "", "请选择"), "请选择");
  });
});
