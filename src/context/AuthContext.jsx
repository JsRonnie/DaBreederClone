import { createContext, useCallback, useEffect, useRef, useState } from "react";
import supabase from "../lib/supabaseClient";
import { upsertUserProfile } from "../lib/profile";
import { fetchDogsForUser } from "../lib/dogQueries";

import BannedUserModal from "../components/BannedUserModal";

const AuthContext = createContext();

export { AuthContext };

const DOGS_CACHE = (globalThis.__DB_DOGS_CACHE__ = globalThis.__DB_DOGS_CACHE__ || {});

const cacheKeyForUser = (userId) => (userId ? `u:${userId}` : "anon");

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const sessionWaitersRef = useRef([]);
  const refreshInFlightRef = useRef(null);
  const bootstrappedRef = useRef(false);

  const resolveSessionWaiters = useCallback((value) => {
    if (!sessionWaitersRef.current.length) return;
    sessionWaitersRef.current.forEach((resolve) => resolve(value));
    sessionWaitersRef.current = [];
  }, []);

  const waitForSession = useCallback(() => {
    if (sessionReady) {
      return Promise.resolve(session);
    }
    return new Promise((resolve) => {
      sessionWaitersRef.current.push(resolve);
    });
  }, [sessionReady, session]);

  const toAppUser = useCallback(async (session) => {
    const user = session?.user;
    if (!user) return null;
    // If anonymous sign-ins are enabled, ignore anonymous sessions for app login state
    // Detect via user.is_anonymous (new) or provider === 'anonymous' (fallback)
    const provider = user.app_metadata?.provider;
    if (user.is_anonymous || provider === "anonymous") return null;

    // Fetch the actual role and ban status from the database
    let userRole = "user"; // default
    let isBanned = false;
    let banReason = null;
    try {
      console.log("AuthContext: Fetching role and ban status for user", user.id);
      const { data: profile } = await supabase
        .from("users")
        .select("role, is_active, ban_reason")
        .eq("id", user.id)
        .single();

      console.log(
        "AuthContext: Profile role from DB:",
        profile?.role,
        "is_active:",
        profile?.is_active
      );

      if (profile?.role) {
        userRole = profile.role;
      }

      // Check if user is banned
      if (profile?.is_active === false) {
        isBanned = true;
        banReason = profile?.ban_reason || "Your account has been suspended";
      }
    } catch (err) {
      console.warn("Could not fetch user profile:", err);
    }

    const meta = user.user_metadata || {};
    return {
      id: user.id,
      name: meta.name || meta.full_name || user.email?.split("@")[0] || "User",
      email: user.email || null,
      role: userRole,
      isBanned,
      banReason,
      avatarUrl:
        meta.avatar_url ||
        meta.avatarUrl ||
        "https://api.dicebear.com/9.x/initials/svg?seed=" + encodeURIComponent(user.email || "U"),
    };
  }, []);

  // Prefetch user's dogs into the global cache to warm other pages (FindMatch, MyDogs)
  const prefetchUserDogs = useCallback(async (userId) => {
    if (!userId) return;
    const cacheKey = cacheKeyForUser(userId);
    try {
      const existing = DOGS_CACHE[cacheKey];
      if (existing && Date.now() - (existing.lastFetch || 0) < 15 * 60 * 1000) return;
      const mapped = await fetchDogsForUser(userId);
      const normalized = mapped || [];
      DOGS_CACHE[cacheKey] = {
        dogs: normalized,
        lastFetch: Date.now(),
        error: null,
      };
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dogs:cache-prefetched", { detail: { userId } }));
      }
    } catch (err) {
      console.warn("prefetchUserDogs failed:", err?.message || err);
    }
  }, []);

  const applySessionState = useCallback(
    async (nextSession, { event } = {}) => {
      setSession(nextSession || null);

      const appUser = await toAppUser(nextSession);
      setUser(appUser);

      const isAdminRoute = window.location.pathname.startsWith("/admin");
      if (appUser && !isAdminRoute) {
        const shouldUpsert = !bootstrappedRef.current || event === "SIGNED_IN";
        if (shouldUpsert && nextSession?.user) {
          upsertUserProfile(supabase, nextSession.user).catch((err) => {
            console.warn("Profile upsert skipped:", err?.message || err);
          });
        }
        prefetchUserDogs(appUser.id);
      }

      if (!bootstrappedRef.current) {
        bootstrappedRef.current = true;
      }

      setSessionReady(true);
      setLoading(false);
      resolveSessionWaiters(nextSession || null);
    },
    [prefetchUserDogs, resolveSessionWaiters, toAppUser]
  );

  const handleLogout = async () => {
    console.log("Logout initiated..."); // Debug log

    // Immediately clear user state
    setUser(null);
    setSession(null);

    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase signout error:", error);
      } else {
        console.log("Supabase signout successful");
      }
    } catch (err) {
      console.error("Logout error:", err);
    }

    // Clear local storage
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (/^sb-.*-auth-token$/.test(k) || k.includes("supabase")) {
          localStorage.removeItem(k);
          console.log("Removed localStorage key:", k);
        }
      }
      // Also clear sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      for (const k of sessionKeys) {
        if (/^sb-.*-auth-token$/.test(k) || k.includes("supabase")) {
          sessionStorage.removeItem(k);
        }
      }
    } catch (err) {
      console.error("Error clearing storage:", err);
    }

    console.log("Logout completed, redirecting...");
    // Redirect to home page
    window.location.href = "/";
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        await applySessionState(data?.session, { event: "INITIAL" });
      } catch (err) {
        console.warn("Initial session fetch failed", err);
        bootstrappedRef.current = true;
        setSessionReady(true);
        setLoading(false);
        resolveSessionWaiters(null);
      }
    };

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted || !bootstrappedRef.current) return;
      await applySessionState(nextSession, { event });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applySessionState, resolveSessionWaiters]);

  const refreshSession = useCallback(() => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }
    const pending = supabase.auth
      .getSession()
      .then(async ({ data }) => {
        await applySessionState(data?.session, { event: "REFRESH" });
        return data?.session || null;
      })
      .catch((err) => {
        console.warn("Session refresh failed", err);
        resolveSessionWaiters(null);
        return null;
      })
      .finally(() => {
        refreshInFlightRef.current = null;
      });

    refreshInFlightRef.current = pending;
    return pending;
  }, [applySessionState, resolveSessionWaiters]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshSession]);

  const value = {
    user,
    session,
    loading,
    sessionReady,
    waitForSession,
    refreshSession,
    logout: handleLogout,
    setUser,
  };

  return (
    <>
      {user?.isBanned && <BannedUserModal user={user} onLogout={handleLogout} />}
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </>
  );
}
