import supabase from "./supabaseClient";

export function clearSupabaseAuthStorage() {
  try {
    const keys = Object.keys(localStorage || {});
    for (const k of keys) {
      if (/^sb-.*-auth-token$/.test(k) || k.includes("supabase")) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* noop */
  }
  try {
    const keys = Object.keys(sessionStorage || {});
    for (const k of keys) {
      if (/^sb-.*-auth-token$/.test(k) || k.includes("supabase")) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {
    /* noop */
  }
}

function isInvalidRefreshError(err) {
  const msg = (err?.message || err?.error || "").toLowerCase();
  return (
    msg.includes("invalid refresh token") ||
    msg.includes("refresh token not found") ||
    msg.includes("session not found")
  );
}

export async function safeGetUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && isInvalidRefreshError(error)) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* noop */
      }
      clearSupabaseAuthStorage();
      // Return a normalized shape
      return { data: { user: null }, error: null, handled: true };
    }
    return { data, error, handled: false };
  } catch (err) {
    if (isInvalidRefreshError(err)) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* noop */
      }
      clearSupabaseAuthStorage();
      return { data: { user: null }, error: null, handled: true };
    }
    return { data: { user: null }, error: err, handled: false };
  }
}
