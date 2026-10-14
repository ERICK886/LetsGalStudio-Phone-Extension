/** External subscribers must never prevent subsequent notifications or cleanup. */
export function notifyListeners<T>(listeners: Iterable<(value: T) => void>, value: T): void {
  for (const listener of [...listeners]) {
    try {
      listener(value);
    } catch (error) {
      console.warn("[phone-sdk] listener failed", error);
    }
  }
}
