/**
 * @file styles-no-hardcoded-id.test.ts
 * @description 断言 phone/toast CSS 选择器不再绑死官方扩展包 id。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.4.0
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const HARDCODED = "ink.zenly.ext-7a9373";

describe("host CSS 无硬编码扩展包 id 选择器", () => {
  it("phone.css / toast.css 不含字面量 ink.zenly.ext-7a9373", () => {
    const phoneCss = readFileSync(
      join(here, "phone/ui/styles/phone.css"),
      "utf8",
    );
    const toastCss = readFileSync(join(here, "toast/styles/toast.css"), "utf8");

    assert.equal(phoneCss.includes(HARDCODED), false);
    assert.equal(toastCss.includes(HARDCODED), false);
    assert.equal(phoneCss.includes("[data-phone-root]"), true);
    assert.equal(toastCss.includes("[data-phone-toast-root]"), true);
  });
});
