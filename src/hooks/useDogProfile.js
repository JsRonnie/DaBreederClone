import { useCallback, useEffect, useRef, useState } from "react";
import supabase from "../lib/supabaseClient";

function parseDogId(dogId) {
  return dogId != null ? String(dogId) : null;
}

function readDogFromDetailCache(dogId) {
  if (typeof window === "undefined" || !dogId) return null;
  try {
    const raw = window.localStorage.getItem(`db:dog:${dogId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.dog || null;
  } catch {
    return null;
  }
}

function writeDogToDetailCache(dogId, dog) {
  if (typeof window === "undefined" || !dogId || !dog) return;
  try {
    window.localStorage.setItem(`db:dog:${dogId}`, JSON.stringify({ dog, ts: Date.now() }));
  } catch {
    /* ignore quota errors */
  }
}

function readDogFromGlobalCache(dogId) {
  if (!dogId) return null;
  try {
    const cache = globalThis.__DB_DOGS_CACHE__;
    if (cache && typeof cache === "object") {
      for (const key of Object.keys(cache)) {
        const list = cache[key]?.dogs;
        if (!Array.isArray(list)) continue;
        const match = list.find((d) => String(d?.id) === dogId);
        if (match) return match;
      }
    }
  } catch {
    /* ignore */
  }

  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("db:dogs:")) continue;
      try {
        const parsed = JSON.parse(window.localStorage.getItem(key));
        if (!parsed?.dogs) continue;
        const match = parsed.dogs.find((d) => String(d?.id) === dogId);
        if (match) return match;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

function derivePhotoUrl(dogLike) {
  if (!dogLike) return null;
  const candidates = [dogLike.photoUrl, dogLike.image_url, dogLike.image];
  for (const value of candidates) {
    if (typeof value === "string" && value.length > 0) {
      if (/^https?:\/\//i.test(value)) return value;
      if (value.startsWith("/")) return value;
    }
  }
  return null;
}

/**
 * Load a single dog's profile by id.
 * - Fetches the dog row
 * - Resolves photo URL from image_url (if present)
 * - Handles cancellation to avoid setting state on unmounted
 */
export default function useDogProfile(dogId) {
  const [dog, setDog] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasHydratedCache, setHasHydratedCache] = useState(false);
  const alive = useRef(true);
  const dogKey = parseDogId(dogId);
  const requestIdRef = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Instant hydration from any cached dog data.
  useEffect(() => {
    if (!dogKey) {
      setDog(null);
      setPhotoUrl(null);
      setHasHydratedCache(true);
      return;
    }

    const cachedDog = readDogFromDetailCache(dogKey) || readDogFromGlobalCache(dogKey);
    if (cachedDog) {
      setDog((prev) => (prev && prev.id === cachedDog.id ? { ...prev, ...cachedDog } : cachedDog));
      const cachedPhoto = derivePhotoUrl(cachedDog);
      if (cachedPhoto) setPhotoUrl(cachedPhoto);
    }
    setHasHydratedCache(true);
  }, [dogKey]);

  const fetchDog = useCallback(async () => {
    if (!dogKey) {
      setDog(null);
      setPhotoUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);

      const { data: dogRow, error: dogErr } = await supabase
        .from("dogs")
        .select("*")
        .eq("id", dogKey)
        .single();

      if (dogErr) throw dogErr;
      if (!alive.current || requestIdRef.current !== requestId) return;

      setDog(dogRow);
      const url = derivePhotoUrl(dogRow);
      setPhotoUrl(url);
      writeDogToDetailCache(dogKey, dogRow);
    } catch (e) {
      if (alive.current && requestIdRef.current === requestId) setError(e);
    } finally {
      if (alive.current && requestIdRef.current === requestId) setLoading(false);
    }
  }, [dogKey]);

  useEffect(() => {
    fetchDog();
  }, [fetchDog]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleFocus = () => fetchDog();
    const handleOnline = () => fetchDog();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [fetchDog]);

  return { dog, photoUrl, loading, error, hasHydratedCache };
}
