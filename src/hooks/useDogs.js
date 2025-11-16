import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import supabase from "../lib/supabaseClient";
import { DOG_LIST_COLUMNS } from "../lib/dogs";
import { AuthContext } from "../context/AuthContext";
import React from "react";

// Simple per-user cache to avoid refetching on quick navigations
const DOGS_CACHE = (globalThis.__DB_DOGS_CACHE__ = globalThis.__DB_DOGS_CACHE__ || {});
const FIVE_MIN = 5 * 60 * 1000;

function mapDogRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || "Unnamed",
    breed: row.breed || "Unknown",
    age_years: row.age_years ?? null,
    sex: row.gender || row.sex || null,
    image: row.image || row.image_url || null,
    hidden: !!row.hidden,
    is_visible: row.is_visible ?? true,
    user_id: row.user_id,
  };
}

async function fetchDogsForUser(userId) {
  if (!userId) return [];
  // Try selecting a stable subset of columns; if schema differences cause an error, fallback to *
  const baseCols = Array.from(new Set([...DOG_LIST_COLUMNS, "sex"]));
  let resp = await supabase
    .from("dogs")
    .select(baseCols.join(", "))
    .eq("user_id", userId)
    .order("id", { ascending: false });

  if (resp.error && (resp.error.code === "42703" || /column/.test(resp.error.message || ""))) {
    resp = await supabase
      .from("dogs")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });
  }
  if (resp.error) throw resp.error;
  return (resp.data || []).map(mapDogRow);
}

export default function useDogs(options = {}) {
  const { user } = React.useContext(AuthContext) || {};
  const userId = options.userId || user?.id || null;

  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const invalidateTsRef = useRef(globalThis.__DB_DOGS_INVALIDATE_TS__ || 0);

  const cacheKey = useMemo(() => (userId ? `u:${userId}` : "anon"), [userId]);

  const load = useCallback(
    async (force = false) => {
      if (!userId) {
        setDogs([]);
        setLoading(false);
        setError(null);
        return [];
      }

      const cache = DOGS_CACHE[cacheKey];
      const freshEnough = cache && Date.now() - (cache.lastFetch || 0) < FIVE_MIN;
      if (!force && freshEnough) {
        setDogs(cache.dogs || []);
        setError(cache.error || null);
        setLoading(false);
        return cache.dogs || [];
      }

      try {
        setLoading(true);
        setError(null);
        const rows = await fetchDogsForUser(userId);
        DOGS_CACHE[cacheKey] = { dogs: rows, lastFetch: Date.now(), error: null };
        setDogs(rows);
        return rows;
      } catch (e) {
        DOGS_CACHE[cacheKey] = { dogs: [], lastFetch: Date.now(), error: e };
        setError(e);
        setDogs([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [userId, cacheKey]
  );

  // Initial and userId change
  useEffect(() => {
    load();
  }, [load]);

  // Invalidate when global invalidation timestamp changes (set in useFormData submit/update)
  useEffect(() => {
    const iv = setInterval(() => {
      const ts = globalThis.__DB_DOGS_INVALIDATE_TS__ || 0;
      if (ts && ts !== invalidateTsRef.current) {
        invalidateTsRef.current = ts;
        load(true);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [load]);

  // Optional: refresh on window focus
  useEffect(() => {
    function onFocus() {
      const cache = DOGS_CACHE[cacheKey];
      const stale = !cache || Date.now() - (cache.lastFetch || 0) > FIVE_MIN;
      if (stale) load(true);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [cacheKey, load]);

  // Realtime: subscribe to changes to current user's dogs and update list/cache
  useEffect(() => {
    if (!userId) return;
    // Use a unique channel per user to avoid cross-talk
    const channel = supabase
      .channel(`dogs-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dogs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const type = payload?.eventType || payload?.event;
          const n = payload?.new || null;
          const o = payload?.old || null;

          // For safety, if we don't have a current list yet, trigger a refetch
          if (!dogs || dogs.length === 0) {
            load(true);
            return;
          }

          if (type === "INSERT" && n) {
            const mapped = mapDogRow(n);
            if (!mapped?.id) return;
            setDogs((prev) => {
              const exists = prev.some((d) => d.id === mapped.id);
              const next = exists
                ? prev.map((d) => (d.id === mapped.id ? { ...d, ...mapped } : d))
                : [mapped, ...prev];
              DOGS_CACHE[cacheKey] = {
                dogs: next,
                lastFetch: Date.now(),
                error: null,
              };
              return next;
            });
          } else if (type === "UPDATE" && n) {
            const mapped = mapDogRow(n);
            if (!mapped?.id) return;
            setDogs((prev) => {
              const next = prev.map((d) => (d.id === mapped.id ? { ...d, ...mapped } : d));
              DOGS_CACHE[cacheKey] = {
                dogs: next,
                lastFetch: Date.now(),
                error: null,
              };
              return next;
            });
          } else if (type === "DELETE" && o) {
            const delId = o.id;
            if (!delId) return;
            setDogs((prev) => {
              const next = prev.filter((d) => d.id !== delId);
              DOGS_CACHE[cacheKey] = {
                dogs: next,
                lastFetch: Date.now(),
                error: null,
              };
              return next;
            });
          } else {
            // Unknown event — ensure consistency via refetch
            load(true);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, [userId, cacheKey, load, dogs]);

  const toggleDogVisibility = useCallback(
    async (dogId, isVisible) => {
      try {
        const { error: updateError } = await supabase
          .from("dogs")
          .update({ is_visible: isVisible })
          .eq("id", dogId);

        if (updateError) throw updateError;

        // Optimistically update the local state
        setDogs((prev) => prev.map((d) => (d.id === dogId ? { ...d, is_visible: isVisible } : d)));

        // Update cache
        if (DOGS_CACHE[cacheKey]) {
          DOGS_CACHE[cacheKey].dogs = DOGS_CACHE[cacheKey].dogs.map((d) =>
            d.id === dogId ? { ...d, is_visible: isVisible } : d
          );
        }

        return { success: true };
      } catch (err) {
        console.error("Error toggling dog visibility:", err);
        return { success: false, error: err };
      }
    },
    [cacheKey]
  );

  const deleteDog = useCallback(
    async (dogId) => {
      try {
        const { error: deleteError } = await supabase.from("dogs").delete().eq("id", dogId);

        if (deleteError) throw deleteError;

        // Optimistically update the local state
        setDogs((prev) => prev.filter((d) => d.id !== dogId));

        // Update cache
        if (DOGS_CACHE[cacheKey]) {
          DOGS_CACHE[cacheKey].dogs = DOGS_CACHE[cacheKey].dogs.filter((d) => d.id !== dogId);
        }

        return { success: true };
      } catch (err) {
        console.error("Error deleting dog:", err);
        return { success: false, error: err };
      }
    },
    [cacheKey]
  );

  return {
    dogs,
    loading,
    error,
    refetch: () => load(true),
    toggleDogVisibility,
    deleteDog,
    // also expose setDogs for UI-level optimistic updates if needed
    setDogs,
  };
}
