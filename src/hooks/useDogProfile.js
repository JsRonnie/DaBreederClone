import { useEffect, useRef, useState } from "react";
import supabase from "../lib/supabaseClient";

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
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!dogId) {
      setDog(null);
      setPhotoUrl(null);
      return;
    }

    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);

        const { data: dogRow, error: dogErr } = await supabase
          .from("dogs")
          .select("*")
          .eq("id", dogId)
          .single();

        if (dogErr) throw dogErr;
        if (cancelled || !alive.current) return;

        setDog(dogRow);
        // Prefer image_url if it's a full URL; otherwise just leave null and let UI show placeholder
        const url =
          typeof dogRow.image_url === "string" && dogRow.image_url.startsWith("http")
            ? dogRow.image_url
            : null;
        setPhotoUrl(url);
      } catch (e) {
        if (!cancelled && alive.current) setError(e);
      } finally {
        if (!cancelled && alive.current) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [dogId]);

  return { dog, photoUrl, loading, error };
}
