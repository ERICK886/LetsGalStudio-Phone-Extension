declare const __PHONE_EXTENSION_ID__: string;
import { registerPhonePlugin } from "@ink-zenly/phone-sdk/plugin";
import { {{registerFnName}} } from "./apps/{{appId}}";

export const phoneApps = [{{registerFnName}}];
export const disposePhoneApps = registerPhonePlugin({ extensionId: __PHONE_EXTENSION_ID__, apps: phoneApps });
