/**
 * @file app-id.test.ts
 * @description Studio 程序引用路径：必须含扩展 ID。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.5.5
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isStudioProgramRefPath,
  toPhoneAppId,
  toStudioProgramRefPath,
} from "./app-id.ts";

describe("studio program ref path", () => {
  it("requires extensionId/programId", () => {
    assert.equal(isStudioProgramRefPath("ink.zenly.app-015abe/phone-chat"), true);
    assert.equal(isStudioProgramRefPath("phone-chat"), false);
    assert.equal(isStudioProgramRefPath("ink.zenly.app-015abe/"), false);
  });

  it("normalizes full path and rejects bare program id", () => {
    assert.equal(
      toStudioProgramRefPath(" ink.zenly.app-015abe / phone-chat "),
      "ink.zenly.app-015abe/phone-chat",
    );
    assert.equal(toStudioProgramRefPath("phone-chat"), null);
  });

  it("toPhoneAppId still extracts program id from full path", () => {
    assert.equal(toPhoneAppId("ink.zenly.app-015abe/phone-chat"), "phone-chat");
    assert.equal(toPhoneAppId("phone-chat"), "phone-chat");
  });
});
