import { createContext, useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import { upsertUserProfile } from "../lib/profile";

const AuthContext = createContext();

export { AuthContext };

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const toAppUser = (session) => {
    const user = session?.user;
    if (!user) return null;
    // If anonymous sign-ins are enabled, ignore anonymous sessions for app login state
    // Detect via user.is_anonymous (new) or provider === 'anonymous' (fallback)
    const provider = user.app_metadata?.provider;
    if (user.is_anonymous || provider === "anonymous") return null;
    const meta = user.user_metadata || {};
    return {
      id: user.id,
      name: meta.name || meta.full_name || user.email?.split("@")[0] || "User",
      email: user.email || null,
      role: "Dog Owner",
      avatarUrl:
        meta.avatar_url ||
        meta.avatarUrl ||
        "https://api.dicebear.com/9.x/initials/svg?seed=" +
          encodeURIComponent(user.email || "U"),
    };
  };

  // Prefetch user's dogs into the global cache to warm other pages (FindMatch, MyDogs)
  async function prefetchUserDogs(userId) {
    if (!userId) return;
    try {
      const GLOBAL = (globalThis.__DB_GLOBAL_DOG_CACHE__ =
        globalThis.__DB_GLOBAL_DOG_CACHE__ || {});
      const existing = GLOBAL[userId];
      // If we have a recent entry (15m), skip
      if (existing && Date.now() - (existing.lastFetch || 0) < 15 * 60 * 1000)
        return;
      const { data, error } = await supabase
        .from("dogs")
        .select("id,name,breed,gender,sex,image_url,hidden,user_id")
        .eq("user_id", userId)
        .order("id", { ascending: false });
      if (error) {
        // Try a resilient fallback without failing the app
        try {
          const fb = await supabase
            .from("dogs")
            .select("*")
            .eq("user_id", userId)
            .order("id", { ascending: false });
          if (!fb.error) {
            GLOBAL[userId] = {
              dogs: fb.data || [],
              lastFetch: Date.now(),
              userId,
            };
          }
        } catch {
          /* noop */
        }
        return;
      }
      // Map to a lightweight shape similar to MyDogs processed shape
      const mapped = (data || []).map((d) => ({
        id: d.id,
        name: d.name || "Unnamed",
        breed: d.breed || "Unknown",
        age_years: d.age_years,
        sex: d.gender || d.sex || null,
        image: d.image || d.image_url || null,
        hidden: !!d.hidden,
      }));
      GLOBAL[userId] = { dogs: mapped, lastFetch: Date.now(), userId };
    } catch (err) {
      // non-fatal
      console.warn("prefetchUserDogs failed:", err?.message || err);
    }
  }

  const handleLogout = async () => {
    console.log("Logout initiated..."); // Debug log

    // Immediately clear user state
    setUser(null);

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
    let initialLoadDone = false;

    // Optimized: Only fetch session once on startup
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      initialLoadDone = true;
      const appUser = toAppUser(data?.session);
      if (appUser) {
        setUser(appUser);
        // Only upsert profile on initial load, not every auth change
        await upsertUserProfile(supabase, data.session.user);
        // Warm the dog cache for faster pages (don't await)
        try {
          prefetchUserDogs(appUser.id);
        } catch {
          /* noop */
        }
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || !initialLoadDone) return;

        const appUser = toAppUser(session);
        if (appUser) {
          setUser(appUser);
          // Only upsert on sign in, not on token refresh
          if (event === "SIGNED_IN") {
            await upsertUserProfile(supabase, session.user);
            // Warm the dog cache on sign-in
            try {
              prefetchUserDogs(appUser.id);
            } catch {
              /* noop */
            }
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    logout: handleLogout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
