/** Phone UI lifetime and presentation are separate: docking does not unmount it. */
export type PhonePresentationMode = "open" | "closing" | "docked";

export function createPhonePresentation(initial: PhonePresentationMode = "open") {
  let mode = initial;
  let animate = false;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => mode,
    shouldAnimate: () => animate,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    set(next: PhonePresentationMode, animated = true) {
      if (mode === next) return;
      mode = next;
      animate = animated;
      for (const listener of [...listeners]) {
        try { listener(); } catch (error) { console.error("[phone] presentation listener failed", error); }
      }
    },
  };
}

export type PhonePresentation = ReturnType<typeof createPhonePresentation>;
