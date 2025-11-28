import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import supabase from "../lib/supabaseClient";
import { AuthContext } from "../context/AuthContext";
import React from "react";
import { fetchDogsForUser, mapDogRow } from "../lib/dogQueries";

// Simple per-user cache to avoid refetching on quick navigations
const DOGS_CACHE = (globalThis.__DB_DOGS_CACHE__ = globalThis.__DB_DOGS_CACHE__ || {});
const FIVE_MIN = 5 * 60 * 1000;

export default function useDogs(options = {}) {
  const { user, sessionReady } = React.useContext(AuthContext) || {};
  const userId = options.userId || user?.id || null;
  const canQuery = !!userId;

  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lastSuccessfulDogsRef = useRef([]);
  const hydratedFromStorageRef = useRef(false);
  const emptyRetryRef = useRef(false);

  const cacheKey = useMemo(() => (userId ? `u:${userId}` : "anon"), [userId]);
  const storageKey = useMemo(() => (userId ? `db:dogs:${userId}` : null), [userId]);

  const applyCacheSnapshot = useCallback(() => {
    const cache = DOGS_CACHE[cacheKey];
    if (cache?.dogs) {
      lastSuccessfulDogsRef.current = cache.dogs;
      setDogs(cache.dogs);
      setError(cache.error || null);
      setLoading(false);
      return cache.dogs;
    }
    if (lastSuccessfulDogsRef.current.length > 0) {
      setDogs(lastSuccessfulDogsRef.current);
      setError(null);
      setLoading(false);
      return lastSuccessfulDogsRef.current;
    }
    return null;
  }, [cacheKey]);

  useEffect(() => {
    applyCacheSnapshot();
  }, [applyCacheSnapshot]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      hydratedFromStorageRef.current = true;
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.dogs)) {
          setDogs(parsed.dogs);
          lastSuccessfulDogsRef.current = parsed.dogs;
          DOGS_CACHE[cacheKey] = {
            dogs: parsed.dogs,
            lastFetch: 0,
            error: null,
          };
        }
      }
    } catch (err) {
      if (typeof import.meta !== "undefined" && import.meta?.env?.DEV) {
        console.warn("useDogs: failed to hydrate cached dogs", err);
      }
    } finally {
      hydratedFromStorageRef.current = true;
    }
  }, [storageKey, cacheKey]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined" || !hydratedFromStorageRef.current) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ dogs, ts: Date.now() }));
    } catch (err) {
      if (typeof import.meta !== "undefined" && import.meta?.env?.DEV) {
        console.warn("useDogs: unable to persist dogs locally", err);
      }
    }
  }, [dogs, storageKey]);

  const load = useCallback(
    async (force = false) => {
      if (!userId) {
        if (lastSuccessfulDogsRef.current.length > 0) {
          setDogs(lastSuccessfulDogsRef.current);
          setLoading(false);
        } else {
          setDogs([]);
          setLoading(true);
        }
        setError(null);
        return lastSuccessfulDogsRef.current;
      }

      const cache = DOGS_CACHE[cacheKey];
      const freshEnough = cache && Date.now() - (cache.lastFetch || 0) < FIVE_MIN;
      const cacheHasError = !!cache?.error;
      if (!force && freshEnough && !cacheHasError) {
        const cachedDogs = cache.dogs || [];
        lastSuccessfulDogsRef.current = cachedDogs;
        setDogs(cachedDogs);
        setError(null);
        setLoading(false);
        return cachedDogs;
      }

      try {
        const hadCache = lastSuccessfulDogsRef.current.length > 0;
        if (hadCache) {
          setDogs(lastSuccessfulDogsRef.current);
          setError(null);
        }
        setLoading(!hadCache);
        setError(null);
        let rows = await fetchDogsForUser(userId);

        // If we previously had data but Supabase temporarily returns an empty array,
        // retry once before trusting the empty payload. This mirrors the more
        // aggressive refetch behavior used on the admin dashboards.
        if (rows.length === 0 && lastSuccessfulDogsRef.current.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          const retryRows = await fetchDogsForUser(userId);
          if (retryRows.length > 0) {
            rows = retryRows;
          }
        }

        DOGS_CACHE[cacheKey] = { dogs: rows, lastFetch: Date.now(), error: null };
        lastSuccessfulDogsRef.current = rows;
        setDogs(rows);
        return rows;
      } catch (e) {
        DOGS_CACHE[cacheKey] = {
          dogs: lastSuccessfulDogsRef.current,
          lastFetch: 0,
          error: e,
        };
        setError(e);
        if (lastSuccessfulDogsRef.current.length > 0) {
          setDogs(lastSuccessfulDogsRef.current);
          return lastSuccessfulDogsRef.current;
        }
        setDogs([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [userId, cacheKey]
  );

  useEffect(() => {
    lastSuccessfulDogsRef.current = [];
    hydratedFromStorageRef.current = false;
  }, [cacheKey]);

  // Initial and userId change
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleInvalidate = () => load(true);
    window.addEventListener("dogs:invalidate", handleInvalidate);
    return () => window.removeEventListener("dogs:invalidate", handleInvalidate);
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handlePrefetch = (evt) => {
      if (evt?.detail?.userId !== userId) return;
      applyCacheSnapshot();
    };
    window.addEventListener("dogs:cache-prefetched", handlePrefetch);
    return () => window.removeEventListener("dogs:cache-prefetched", handlePrefetch);
  }, [applyCacheSnapshot, cacheKey, userId]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        load(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleFocus = () => load(true);
    const handleOnline = () => load(true);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [load]);

  useEffect(() => {
    if (!canQuery || loading) return;
    if (!hydratedFromStorageRef.current) return;
    if (dogs.length > 0) {
      emptyRetryRef.current = false;
      return;
    }
    if (emptyRetryRef.current) return;
    emptyRetryRef.current = true;
    (async () => {
      try {
        const rows = await load(true);
        if (!rows || rows.length === 0) {
          setError(
            new Error("We couldn't reach your dog list. Please check your connection and retry.")
          );
        }
      } finally {
        if (lastSuccessfulDogsRef.current.length > 0) {
          emptyRetryRef.current = false;
        }
      }
    })();
  }, [canQuery, dogs.length, load, loading]);

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
          if (!lastSuccessfulDogsRef.current || lastSuccessfulDogsRef.current.length === 0) {
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
              lastSuccessfulDogsRef.current = next;
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
              lastSuccessfulDogsRef.current = next;
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
              lastSuccessfulDogsRef.current = next;
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
  }, [userId, cacheKey, load]);

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

  const refetch = useCallback(() => load(true), [load]);

  return {
    dogs,
    loading,
    error,
    ready: sessionReady && !!userId,
    refetch,
    toggleDogVisibility,
    deleteDog,
    // also expose setDogs for UI-level optimistic updates if needed
    setDogs,
  };
}
