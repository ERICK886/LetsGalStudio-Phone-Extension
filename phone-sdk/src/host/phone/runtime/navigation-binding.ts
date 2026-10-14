import { getPhoneSdkSlot } from "../../../client/runtime/slot";
import type { PhoneNavigationController } from "../../../client/runtime/types";

/** Disposing an old registration must never remove a newer controller. */
export function installNavigationBinding(controller: PhoneNavigationController): () => void {
  const slot = getPhoneSdkSlot();
  slot.navigation = controller;
  return () => {
    if (slot.navigation === controller) delete slot.navigation;
  };
}
