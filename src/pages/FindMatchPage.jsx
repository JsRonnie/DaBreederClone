import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from "react";
import supabase from "../lib/supabaseClient";
import { calculateMatchScore } from "../utils/matchmaking";
import { Link, useLocation } from "react-router-dom";
import "./FindMatchPage.css";
import { AuthContext } from "../context/AuthContext";

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

  const [userDogs, setUserDogs] = useState(
    () => GLOBAL_FINDMATCH_CACHE.userDogs || []
  );
  const [selectedDog, setSelectedDog] = useState(null);
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        effectiveUserId = user?.id || null;
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

      // Try minimal columns first; fall back to * if schema differs
      let query = supabase
        .from("dogs")
        .select("id,name,breed,gender,sex,image_url,hidden,user_id")
        .eq("user_id", effectiveUserId)
        .order("id", { ascending: false });
      let { data, error } = await query;
      if (error && /42703|column|does not exist/i.test(error.message || "")) {
        FM_LOG("fetchUserDogs: column mismatch, falling back to *");
        const fb = await supabase
          .from("dogs")
          .select("*")
          .eq("user_id", effectiveUserId)
          .order("id", { ascending: false });
        data = fb.data;
        error = fb.error;
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
          const fallback = await supabase
            .from("dogs")
            .select("*")
            .order("id", { ascending: false });
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
      setUserDogs(data || []);
      GLOBAL_FINDMATCH_CACHE.userDogs = data || [];
      GLOBAL_FINDMATCH_CACHE.lastFetch = Date.now();
      FM_LOG("fetchUserDogs: cache updated", {
        count: (data || []).length,
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
      }
    }
  }, [location.state, fetchUserDogs]);

  // Removed focus/visibility-based auto refresh; we rely on global invalidation from add/edit/delete only

  // Removed long-loading detector and retry UI for a cleaner experience

  const handleSelectDog = async (dog) => {
    FM_LOG("selectDog:", { id: dog.id, name: dog.name });
    setSelectedDog(dog);
    setMatchesLoading(true);
    setError(null);
    // Keep existing matches visible during fetch for better UX

    const {
      data: { user },
    } = await supabase.auth.getUser();
    FM_LOG("matches: fetching for dog", { id: dog.id, userId: user?.id });

    // Try a robust query sequence that adapts to schema and RLS
    async function queryOthers({
      genderColumn = "gender",
      includeHiddenFilter = true,
    }) {
      let q = supabase
        .from("dogs")
        .select("*")
        .order("id", { ascending: false })
        .limit(200);
      // Exclude same gender if column exists
      if (genderColumn)
        q = q.neq(
          genderColumn,
          dog[genderColumn] || dog.gender || dog.sex || null
        );
      // Exclude my own dogs when possible
      if (user?.id) q = q.neq("user_id", user.id);
      // Only show visible/public dogs when possible
      if (includeHiddenFilter) q = q.eq("hidden", false);
      return await q;
    }

    const myReq = ++matchesRequestIdRef.current;
    let resp = await queryOthers({
      genderColumn: "gender",
      includeHiddenFilter: true,
    });
    if (resp.error) {
      const msg = (resp.error.message || "").toLowerCase();
      FM_LOG("matches: first query error", msg);
      // If hidden column doesn't exist, try without it
      if (msg.includes("hidden") && msg.includes("does not exist")) {
        resp = await queryOthers({
          genderColumn: "gender",
          includeHiddenFilter: false,
        });
      }
    }

    // If gender column doesn't exist, try 'sex'
    if (resp.error) {
      const msg = (resp.error.message || "").toLowerCase();
      FM_LOG("matches: gender column missing?", msg);
      if (msg.includes("gender") && msg.includes("does not exist")) {
        resp = await queryOthers({
          genderColumn: "sex",
          includeHiddenFilter: true,
        });
        if (resp.error) {
          const msg2 = (resp.error.message || "").toLowerCase();
          FM_LOG("matches: sex+hidden error", msg2);
          if (msg2.includes("hidden") && msg2.includes("does not exist")) {
            resp = await queryOthers({
              genderColumn: "sex",
              includeHiddenFilter: false,
            });
          }
        }
      }
    }

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
