import { registerPhonePlugin } from "@ink-zenly/phone-sdk/plugin";
import { {{registerFnName}} } from "{{registrationImport}}";

declare const __PHONE_EXTENSION_ID__: string;
export const phoneApps = [{{registerFnName}}];
export const disposePhoneApps = registerPhonePlugin({
  extensionId: __PHONE_EXTENSION_ID__,
  apps: phoneApps,
});
export { {{controllerExports}} } from "{{controllerImport}}";
