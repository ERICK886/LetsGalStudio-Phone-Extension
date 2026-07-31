import {
  Extension,
  extension,
  type ExtensionRenderData,
} from "@avg-studio/sdk";
import { subscribeToasts } from "../core/toast-runtime";
import { PhoneToastUI, type PhoneToastProps } from "../ui/toast-ui";

@extension({ id: "phone-toast", label: "手机操作提示", category: "游戏系统" })
export class ToastExtension extends Extension<PhoneToastProps> {
  render(): ExtensionRenderData<PhoneToastProps> {
    return {
      component: PhoneToastUI,
      props: {
        subscribeToasts: (listener) => subscribeToasts(this.context, listener),
        closeToastUi: () => this.close(),
      },
    };
  }
}