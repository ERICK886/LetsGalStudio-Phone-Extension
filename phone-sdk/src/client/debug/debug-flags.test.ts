import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  PHONE_SDK_DEBUG_FLAG_KEY,
  createDebugPhoneAppRenderProps,
  isPhoneSdkDebugEnabled,
} from "./debug.ts";
import {
  PHONE_SDK_DIAG_FLAG_KEY,
  isPhoneSdkDiagEnabled,
} from "./diag.ts";

const globals = globalThis as typeof globalThis & Record<string, unknown>;

afterEach(() => {
  delete globals[PHONE_SDK_DEBUG_FLAG_KEY];
  delete globals[PHONE_SDK_DIAG_FLAG_KEY];
});

describe("phone sdk diagnostics flags", () => {
  it("默认关闭重型调试与诊断", () => {
    assert.equal(isPhoneSdkDebugEnabled(), false);
    assert.equal(isPhoneSdkDiagEnabled(), false);
  });

  it("显式开启后才启用", () => {
    globals[PHONE_SDK_DEBUG_FLAG_KEY] = true;
    globals[PHONE_SDK_DIAG_FLAG_KEY] = true;
    assert.equal(isPhoneSdkDebugEnabled(), true);
    assert.equal(isPhoneSdkDiagEnabled(), true);
  });

  it("调试关闭时直接复用原始内页 props", () => {
    const props = {
      appId: "chat",
      closeApp() {},
      closePhone() {},
      safeAreaInsets: { top: 52, right: 0, bottom: 44, left: 0 },
    };
    const bundle = createDebugPhoneAppRenderProps(props);
    assert.equal(bundle.props, props);
  });
});
