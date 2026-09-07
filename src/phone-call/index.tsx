import { defineSave, Extension, extension, settings, type ExtensionContext } from "@avg-studio/sdk";
import { PROGRAM_ID } from "./constants";
import { addPhoneContactMethod, defineOutgoingCallMethod, incomingCallMethod, removePhoneContactMethod } from "./methods";
import { phoneCallSaveFields } from "./save-fields";
import { bindPhoneCallSave, releaseIncomingCall } from "./runtime";
import { buildPhoneCallSettings, cachePhoneCallSettings, phoneCallRuntimeScope, PHONE_CALL_SETTINGS_KEYS, readPhoneCallSettings } from "./settings";

const registrationCleanups = new WeakMap<object, () => void>();

@extension({ id: PROGRAM_ID, label: "手机电话", exposeUI: false, autonomous: true })
export class PhoneCallExtension extends Extension {
  static settings = settings((s) => buildPhoneCallSettings(s)); static saveSchema = defineSave(phoneCallSaveFields);
  static incomingCall = incomingCallMethod; static defineOutgoingCall = defineOutgoingCallMethod; static addContact = addPhoneContactMethod; static removeContact = removePhoneContactMethod;
  static onRegister(ctx: ExtensionContext) {
    const scope = phoneCallRuntimeScope(ctx);
    registrationCleanups.get(scope)?.();
    cachePhoneCallSettings(ctx, readPhoneCallSettings(ctx));
    const unsubscribers = PHONE_CALL_SETTINGS_KEYS.map((key) =>
      ctx.settings.subscribe(key, () =>
        cachePhoneCallSettings(ctx, readPhoneCallSettings(ctx)),
      ),
    );
    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
      releaseIncomingCall(ctx);
      if (registrationCleanups.get(scope) === cleanup) {
        registrationCleanups.delete(scope);
      }
    };
    registrationCleanups.set(scope, cleanup);
    ctx.flow.signal.addEventListener("abort", cleanup, { once: true });
  }
  onInit() { bindPhoneCallSave(this.context, this.save as any); }
  render() { bindPhoneCallSave(this.context, this.save as any); return { component: () => null, props: {} }; }
}
export default PhoneCallExtension;
export { registerPhoneCallApp } from "./ui";
