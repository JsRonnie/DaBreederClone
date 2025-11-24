export function notifyDogsInvalidate(reason = "manual") {
  try {
    globalThis.__DB_DOGS_INVALIDATE_TS__ = Date.now();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dogs:invalidate", { detail: { reason } }));
    }
  } catch {
    /* ignore */
  }
}
