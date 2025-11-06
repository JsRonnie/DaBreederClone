import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from "react";
import supabase from "../lib/supabaseClient";
import { safeGetUser } from "../lib/auth";
import { calculateMatchScore } from "../utils/matchmaking";
import { Link, useLocation } from "react-router-dom";
import "./FindMatchPage.css";
import { AuthContext } from "../context/AuthContext";
import { createCache } from "../lib/cache";
import { getCookie, setCookie } from "../utils/cookies";

// Global cache to avoid empty flashes when auth briefly revalidates on tab switch
const GLOBAL_FINDMATCH_CACHE = (globalThis.__DB_GLOBAL_FINDMATCH_CACHE__ =
  globalThis.__DB_GLOBAL_FINDMATCH_CACHE__ || { userDogs: [], lastFetch: 0 });
// Shared invalidation timestamp with MyDogs: when > lastFetch, we refresh once
if (typeof globalThis.__DB_DOGS_INVALIDATE_TS__ !== "number") {
  globalThis.__DB_DOGS_INVALIDATE_TS__ = 0;
}

export default function FindMatchPage() {
  const location = useLocation();
  const { user: authUser } = useContext(AuthContext);
  // Debug logger for this page
  const FM_LOG = (...args) => console.log("🔎 [FindMatch]", ...args);
  const MATCHES_TTL = 15 * 60 * 1000; // 15 minutes
  const matchesCache = useRef(
    createCache("match-cache", {
      storage: "sessionStorage",
      defaultTTL: MATCHES_TTL,
    })
  );

  const [userDogs, setUserDogs] = useState(
    () => GLOBAL_FINDMATCH_CACHE.userDogs || []
  );
  const [selectedDog, setSelectedDog] = useState(null);
  const selectedDogIdRef = useRef(null);
  const [potentialMatches, setPotentialMatches] = useState([]);
  // Split loading states so selecting a dog doesn't reload the dog grid/card
  const [dogsLoading, setDogsLoading] = useState(
    () => (GLOBAL_FINDMATCH_CACHE.userDogs || []).length === 0
  );
  const [matchesLoading, setMatchesLoading] = useState(false);
  // Simplified loading UI (no long-load hints)
  const [error, setError] = useState(null);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const matchesRequestIdRef = useRef(0);

  const fetchUserDogs = useCallback(async () => {
    // use a request id to ensure only last response wins
    const myReq = ++requestIdRef.current;
    // If another load is in flight, skip this one
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setError(null);
      // Only show spinner if we don't already have cache to render
      const hadCache = (GLOBAL_FINDMATCH_CACHE.userDogs || []).length > 0;
      if (!hadCache) setDogsLoading(true);
      const now = Date.now();
      const invalidateTs = Number(globalThis.__DB_DOGS_INVALIDATE_TS__ || 0);
      const cacheFresh =
        now - (GLOBAL_FINDMATCH_CACHE.lastFetch || 0) < 15 * 60 * 1000; // 15 min TTL
      const hasCache = (GLOBAL_FINDMATCH_CACHE.userDogs || []).length > 0;
      FM_LOG("fetchUserDogs: start", {
        hadCache,
        hasCache,
        cacheFresh,
        invalidateTs,
        lastFetch: GLOBAL_FINDMATCH_CACHE.lastFetch || 0,
        authUserId: authUser?.id || null,
      });
      // Use cache immediately to avoid blank state
      if (hasCache) setUserDogs(GLOBAL_FINDMATCH_CACHE.userDogs);
      // If cache is fresh and wasn't invalidated by add/edit/delete, skip network
      if (
        hasCache &&
        cacheFresh &&
        invalidateTs <= (GLOBAL_FINDMATCH_CACHE.lastFetch || 0)
      ) {
        FM_LOG("fetchUserDogs: using fresh cache, skipping network", {
          count: (GLOBAL_FINDMATCH_CACHE.userDogs || []).length,
        });
        setDogsLoading(false);
        return;
      }
      // Prefer AuthContext user (fast), fall back to supabase.auth.getUser
      let effectiveUserId = authUser?.id || null;
      if (!effectiveUserId) {
        const { data } = await safeGetUser();
        effectiveUserId = data?.user?.id || null;
      }
      // Seed from persistent dogs cache if available (from MyDogs)
      try {
        if (effectiveUserId) {
          const persisted = (await import("../lib/cache"))
            .createCache("dogs-cache", {
              storage: "localStorage",
              defaultTTL: MATCHES_TTL,
            })
            .get(String(effectiveUserId));
          if (Array.isArray(persisted) && persisted.length > 0) {
            FM_LOG("seed from persistent dogs cache", persisted.length);
            setUserDogs(persisted);
            GLOBAL_FINDMATCH_CACHE.userDogs = persisted;
            GLOBAL_FINDMATCH_CACHE.lastFetch = Date.now();
          }
        }
      } catch (err) {
        void err;
      }
      if (!effectiveUserId) {
        // No user yet. If we have cache, keep it and stop spinner; otherwise wait for auth change.
        FM_LOG("fetchUserDogs: no user yet", { hasCache });
        if (hasCache) setDogsLoading(false);
        return;
      }
      // Seed from MyDogs cache (if available) before network
      try {
        const DOG_CACHE = globalThis.__DB_GLOBAL_DOG_CACHE__ || {};
        const dogEntry = DOG_CACHE[effectiveUserId];
        const dogCacheFresh =
          dogEntry && Date.now() - (dogEntry.lastFetch || 0) < MATCHES_TTL;
        if (
          dogEntry &&
          Array.isArray(dogEntry.dogs) &&
          dogEntry.dogs.length > 0
        ) {
          const mapped = dogEntry.dogs.map((d) => ({
            id: d.id,
            name: d.name,
            breed: d.breed,
            gender: d.sex || d.gender || null,
            sex: d.sex || d.gender || null,
            image_url: d.image || d.image_url || null,
            hidden: !!d.hidden,
            user_id: effectiveUserId,
          }));
          FM_LOG("seed from MyDogs cache", {
            count: mapped.length,
            lastFetch: dogEntry.lastFetch,
            fresh: !!dogCacheFresh,
          });
          setUserDogs(mapped);
          GLOBAL_FINDMATCH_CACHE.userDogs = mapped;
          GLOBAL_FINDMATCH_CACHE.lastFetch = dogEntry.lastFetch || Date.now();
          if (dogCacheFresh && invalidateTs <= (dogEntry.lastFetch || 0)) {
            setDogsLoading(false);
            return; // fresh enough, skip network
          }
        }
      } catch (e) {
        FM_LOG("seed cache error", e?.message || e);
      }

      // Try minimal columns first; adapt ordering/columns based on schema
      let data = null;
      let error = null;
      async function tryQuery({
        cols = "*",
        orderBy = null,
        withFilter = true,
      }) {
        let q = supabase.from("dogs").select(cols);
        if (withFilter) q = q.eq("user_id", effectiveUserId);
        if (orderBy) q = q.order(orderBy, { ascending: false });
        const res = await q;
        return { data: res.data, error: res.error };
      }
      ({ data, error } = await tryQuery({}));
      // Fallbacks for column/order mismatches
      if (error) {
        const em = (error.message || error.details || "").toLowerCase();
        if (/42703|column|does not exist/.test(em)) {
          // Already using star select with no order; try gentle ordering fallbacks if needed
          ({ data, error } = await tryQuery({
            cols: "*",
            orderBy: "created_at",
          }));
          if (error) {
            ({ data, error } = await tryQuery({ cols: "*", orderBy: null }));
          }
        }
      }
      if (error) {
        FM_LOG("fetchUserDogs: query error", error);
      } else {
        FM_LOG("fetchUserDogs: fetched rows", (data || []).length);
      }
      if (error) {
        const msg = (error.message || "").toLowerCase();
        // If user_id column doesn't exist, fall back to showing all dogs (dev-friendly)
        if (msg.includes("user_id") && msg.includes("does not exist")) {
          // No user_id column: show all dogs, adapt order if needed
          let fb = await supabase
            .from("dogs")
            .select("*")
            .order("id", { ascending: false });
          let fallback = fb;
          if (fb.error) {
            const em3 = (
              fb.error.message ||
              fb.error.details ||
              ""
            ).toLowerCase();
            if (/id/.test(em3)) {
              const fb2 = await supabase
                .from("dogs")
                .select("*")
                .order("created_at", { ascending: false });
              fallback = fb2.error
                ? await supabase.from("dogs").select("*")
                : fb2;
            }
          }
          if (fallback.error) {
            setError(fallback.error.message);
            setDogsLoading(false);
            return;
          }
          data = fallback.data;
          FM_LOG(
            "fetchUserDogs: user_id missing, using fallback of all dogs",
            (data || []).length
          );
          setError(
            "Note: 'user_id' column missing. Showing all dogs. Add a user_id uuid column to filter per-user."
          );
        } else if (
          msg.includes("permission denied") ||
          msg.includes("not allowed")
        ) {
          FM_LOG("fetchUserDogs: permission denied");
          setError(
            "Permission denied when reading your dogs. If Row Level Security is ON, add select policy: user_id = auth.uid()."
          );
          setDogsLoading(false);
          return;
        } else {
          FM_LOG("fetchUserDogs: unhandled error", error.message);
          setError(error.message);
          setDogsLoading(false);
          return;
        }
      }
      if (requestIdRef.current !== myReq) return;
      // Client-side sort to avoid server 400s from unknown columns
      let list = Array.isArray(data) ? [...data] : [];
      if (list.length > 1) {
        const hasId = Object.prototype.hasOwnProperty.call(list[0], "id");
        const hasCreated = Object.prototype.hasOwnProperty.call(
          list[0],
          "created_at"
        );
        try {
          if (hasCreated) {
            list.sort((a, b) => {
              const ta = new Date(a.created_at).getTime() || 0;
              const tb = new Date(b.created_at).getTime() || 0;
              return tb - ta; // desc
            });
          } else if (hasId) {
            list.sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0));
          }
        } catch {
          // ignore sorting errors and keep original order
        }
      }
      setUserDogs(list);
      GLOBAL_FINDMATCH_CACHE.userDogs = list;
      GLOBAL_FINDMATCH_CACHE.lastFetch = Date.now();
      FM_LOG("fetchUserDogs: cache updated", {
        count: list.length,
        lastFetch: GLOBAL_FINDMATCH_CACHE.lastFetch,
      });
      // Clear invalidation after successful refresh
      try {
        globalThis.__DB_DOGS_INVALIDATE_TS__ = 0;
      } catch {
        /* noop */
      }
      setDogsLoading(false);
    } finally {
      loadingRef.current = false;
    }
  }, [authUser?.id, MATCHES_TTL]);

  useEffect(() => {
    fetchUserDogs();

    // Restore state if coming back from a profile page
    if (location.state) {
      const { selectedDog: savedSelectedDog } = location.state;
      if (savedSelectedDog) {
        FM_LOG("restore: selectedDog from navigation state", {
          id: savedSelectedDog.id,
          name: savedSelectedDog.name,
        });
        setSelectedDog(savedSelectedDog);
        selectedDogIdRef.current = savedSelectedDog.id;
        try {
          setCookie("findmatch_selected_dog", String(savedSelectedDog.id), {
            days: 7,
          });
        } catch (err) {
          void err;
        }
        // Also restore previously computed matches if provided or cached
        const stateMatches = location.state?.potentialMatches;
        if (Array.isArray(stateMatches) && stateMatches.length > 0) {
          FM_LOG("restore: potentialMatches from state", stateMatches.length);
          setPotentialMatches(stateMatches);
          setMatchesLoading(false);
        } else {
          try {
            const cached = matchesCache.current.get(
              `matches:${savedSelectedDog.id}`
            );
            if (Array.isArray(cached) && cached.length > 0) {
              FM_LOG("restore: potentialMatches from cache", cached.length);
              setPotentialMatches(cached);
              setMatchesLoading(false);
            }
          } catch (err) {
            void err;
          }
        }
      }
    }
    // Try restoring selected dog from cookie on mount
    try {
      const sid = getCookie("findmatch_selected_dog");
      if (sid) selectedDogIdRef.current = sid;
    } catch (err) {
      void err;
    }
  }, [location.state, fetchUserDogs]);

  // Removed focus/visibility-based auto refresh; we rely on global invalidation from add/edit/delete only

  // Removed long-loading detector and retry UI for a cleaner experience

  const handleSelectDog = async (dog) => {
    FM_LOG("selectDog:", { id: dog.id, name: dog.name });
    setSelectedDog(dog);
    selectedDogIdRef.current = dog.id;
    try {
      setCookie("findmatch_selected_dog", String(dog.id), { days: 7 });
    } catch (err) {
      void err;
    }
    setMatchesLoading(true);
    setError(null);
    // Keep existing matches visible during fetch for better UX

    const { data: userRes } = await safeGetUser();
    const user = userRes?.user || null;
    FM_LOG("matches: fetching for dog", { id: dog.id, userId: user?.id });

    // Try a robust query sequence that adapts to schema and RLS
    function buildQuery({
      genderField,
      includeHidden,
      orderBy,
      includeUserId,
    }) {
      let q = supabase.from("dogs").select("*").limit(200);
      if (orderBy) q = q.order(orderBy, { ascending: false });
      // Exclude same gender if we have both the column and a value on selected dog
      const genderValue = genderField
        ? dog[genderField] || dog.gender || dog.sex || null
        : null;
      if (genderField && genderValue != null) {
        q = q.neq(genderField, genderValue);
      }
      // Exclude my own dogs when possible (and column exists)
      if (includeUserId && user?.id) q = q.neq("user_id", user.id);
      // Only show visible/public dogs when possible
      if (includeHidden) q = q.eq("hidden", false);
      return q;
    }

    async function runAdaptiveMatchesQuery() {
      // Start optimistic and then adapt based on specific error messages
      let opts = {
        genderField: "gender",
        includeHidden: true,
        orderBy: null,
        includeUserId: true,
      };
      for (let i = 0; i < 8; i++) {
        const res = await buildQuery(opts);
        const resp = await res;
        if (!resp.error) return resp;
        const em = (
          resp.error.message ||
          resp.error.details ||
          ""
        ).toLowerCase();
        // Remove hidden filter if column missing
        if (
          opts.includeHidden &&
          /hidden/.test(em) &&
          /does not exist|42703|column/.test(em)
        ) {
          opts.includeHidden = false;
          continue;
        }
        // Switch gender field from gender -> sex -> none
        if (
          opts.genderField === "gender" &&
          /gender/.test(em) &&
          /does not exist|42703|column/.test(em)
        ) {
          opts.genderField = "sex";
          continue;
        }
        if (
          opts.genderField === "sex" &&
          /sex/.test(em) &&
          /does not exist|42703|column/.test(em)
        ) {
          opts.genderField = null;
          continue;
        }
        // Drop user_id filter if column missing
        if (
          opts.includeUserId &&
          /user_id/.test(em) &&
          /does not exist|42703|column/.test(em)
        ) {
          opts.includeUserId = false;
          continue;
        }
        // No ordering used initially to avoid 400s from unknown order columns
        // No known remediation left
        return resp;
      }
      // Fallback: last attempt without any optional filters/order
      return await buildQuery({
        genderField: null,
        includeHidden: false,
        orderBy: null,
        includeUserId: false,
      });
    }

    const myReq = ++matchesRequestIdRef.current;
    // Cache-first: if we have cached matches for this dog, use them
    const cached = matchesCache.current.get(`matches:${dog.id}`);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      FM_LOG("matches: using cached", cached.length);
      setPotentialMatches(cached);
      setMatchesLoading(false);
      return;
    }

    let resp = await runAdaptiveMatchesQuery();

    if (resp.error) {
      const msg = (resp.error.message || "").toLowerCase();
      FM_LOG("matches: final error", msg);
      if (msg.includes("permission denied") || msg.includes("not allowed")) {
        setError(
          "Permission denied when reading other dogs. If RLS is ON, add a read policy to allow public profiles (e.g., hidden = false)."
        );
      } else {
        setError(resp.error.message);
      }
      setMatchesLoading(false);
      return;
    }

    const rows = resp.data || [];
    FM_LOG("matches: fetched rows", rows.length);
    const scoredMatches = rows
      .map((match) => ({
        ...match,
        score: calculateMatchScore(dog, match),
      }))
      .filter((match) => match.score > 0) // Only show compatible matches
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 3); // Get top 3 matches only
    FM_LOG("matches: scored", {
      total: rows.length,
      shown: scoredMatches.length,
      top: scoredMatches.map((m) => ({ id: m.id, score: m.score })).slice(0, 3),
    });
    if (matchesRequestIdRef.current === myReq) {
      setPotentialMatches(scoredMatches);
      try {
        matchesCache.current.set(`matches:${dog.id}`, scoredMatches);
      } catch (err) {
        void err;
      }
      setMatchesLoading(false);
      FM_LOG("matches: done");
    } else {
      FM_LOG("matches: stale result discarded");
    }
  };

  const handleContact = (match) => {
    // For now, we'll show an alert with contact info
    // In a real app, this would open a messaging system or show contact details
    alert(
      `Contact ${match.name}'s owner through their profile page or messaging system.`
    );
  };

  return (
    <div className="find-match-container">
      {/* Header Section */}
      <div className="header-section">
        <h1 className="page-title">Find Matches</h1>
        <p className="page-description">
          Find compatible breeding partners for your dogs
        </p>
      </div>

      {/* Dog Selection Section */}
      <div className="content-section">
        <h2 className="section-title">Select Your Dog</h2>
        {dogsLoading && userDogs.length === 0 ? (
          <div className="loading-state" style={{ minHeight: 140 }}>
            <div className="loading-spinner" />
            <p>Loading your dogs...</p>
          </div>
        ) : userDogs.length === 0 ? (
          <div className="empty-state">
            <p>Add a dog to your profile first to find matches</p>
            <Link to="/add-dog" className="primary-btn">
              Add Dog
            </Link>
          </div>
        ) : (
          <div className="dogs-grid">
            {userDogs.map((dog) => (
              <div
                key={dog.id}
                className={`dog-card ${
                  selectedDog?.id === dog.id ? "selected" : ""
                }`}
                onClick={() => handleSelectDog(dog)}
              >
                <img
                  src={dog.image_url || "/shibaPor.jpg"}
                  alt={dog.name}
                  className="dog-image"
                  loading="lazy"
                />
                <div className="dog-info">
                  <h3>{dog.name}</h3>
                  <p>{dog.breed}</p>
                  <div
                    className={
                      "gender-pill " +
                      (((dog.gender || dog.sex || "") + "")
                        .toString()
                        .toLowerCase() === "male"
                        ? "male"
                        : ((dog.gender || dog.sex || "") + "")
                            .toString()
                            .toLowerCase() === "female"
                        ? "female"
                        : "unknown")
                    }
                    style={{ marginTop: 6 }}
                  >
                    {(() => {
                      const g = (dog.gender || dog.sex || "").toString();
                      const label = g
                        ? g[0].toUpperCase() + g.slice(1).toLowerCase()
                        : "—";
                      return (
                        <span className="gender-label">
                          {label.toLowerCase()}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results Section */}
      {selectedDog && (
        <div className="content-section">
          <h2 className="section-title">Matches for {selectedDog.name}</h2>

          {matchesLoading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Finding matches...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>{error}</p>
            </div>
          )}

          {!matchesLoading && potentialMatches.length === 0 && !error && (
            <div className="empty-state">
              <p>No compatible matches found at this time.</p>
            </div>
          )}

          {!matchesLoading && potentialMatches.length > 0 && (
            <div className="matches-grid">
              {potentialMatches.map((match, index) => (
                <div key={match.id} className="match-card">
                  <div className="match-rank">#{index + 1}</div>
                  <div className="match-score">{match.score}% Match</div>

                  <div className="card-image-wrapper">
                    <img
                      src={match.image_url || "/shibaPor.jpg"}
                      alt={match.name}
                      className="match-image"
                      loading="lazy"
                    />
                  </div>

                  <div className="card-content">
                    <h3 className="match-name">{match.name}</h3>
                    <div className="match-details">
                      <div className="detail-item">
                        <span className="detail-label">Breed</span>
                        <span className="detail-value capitalize">
                          {match.breed}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Age</span>
                        <span className="detail-value">
                          {match.age_years} years old
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Gender</span>
                        <span className="detail-value capitalize">
                          {match.gender}
                        </span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <Link
                        to={`/dog/${match.id}`}
                        state={{
                          fromFindMatch: true,
                          selectedDog: selectedDog,
                          potentialMatches: potentialMatches,
                        }}
                        className="view-profile-btn"
                      >
                        View Profile
                      </Link>
                      <button
                        className="contact-btn"
                        onClick={() => handleContact(match)}
                      >
                        Contact Owner
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
