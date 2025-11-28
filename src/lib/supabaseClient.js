import { createClient } from "@supabase/supabase-js";

// Use Vite env vars (must start with VITE_). Ensure they are defined in .env.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const fetchTimeoutMs = Number(import.meta.env.VITE_SUPABASE_FETCH_TIMEOUT_MS) || 15000;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase environment variables are missing. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

const ensureApiKeyFetch = async (url, options = {}) => {
  const nextOptions = { ...options };
  const headers = new Headers(options?.headers || {});
  if (supabaseAnonKey && !headers.has("apikey")) {
    headers.set("apikey", supabaseAnonKey);
  }

  let nextUrl = url;
  try {
    const parsed = new URL(url, supabaseUrl);
    if (supabaseAnonKey && !parsed.searchParams.has("apikey")) {
      parsed.searchParams.set("apikey", supabaseAnonKey);
    }
    nextUrl = parsed.toString();
  } catch {
    // ignore invalid URLs (relative). fetch will resolve them.
  }

  nextOptions.headers = headers;

  let timeoutId = null;
  let controller = null;
  if (!nextOptions.signal && Number.isFinite(fetchTimeoutMs) && fetchTimeoutMs > 0) {
    controller = new AbortController();
    nextOptions.signal = controller.signal;
    timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);
  }

  try {
    return await fetch(nextUrl, nextOptions);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      apikey: supabaseAnonKey || "",
    },
    fetch: ensureApiKeyFetch,
  },
});

export default supabase;
