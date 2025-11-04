import React, { useState, useEffect, useRef, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { calculateMatchScore } from "../utils/matchmaking";
import { Link, useLocation } from "react-router-dom";
import "./FindMatchPage.css";

export default function FindMatchPage() {
  const location = useLocation();
  // Global cache to avoid empty flashes when auth briefly revalidates on tab switch
  const GLOBAL_FINDMATCH_CACHE = (globalThis.__DB_GLOBAL_FINDMATCH_CACHE__ =
    globalThis.__DB_GLOBAL_FINDMATCH_CACHE__ || { userDogs: [], lastFetch: 0 });

  const [userDogs, setUserDogs] = useState(() => GLOBAL_FINDMATCH_CACHE.userDogs || []);
  const [selectedDog, setSelectedDog] = useState(null);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false); // >2.5s
  const [verySlowLoad, setVerySlowLoad] = useState(false); // >8s
  const [error, setError] = useState(null);
  const [focusedTick, setFocusedTick] = useState(0);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);

  const fetchUserDogs = useCallback(async () => {
    // use a request id to ensure only last response wins
    const myReq = ++requestIdRef.current;
    // If another load is in flight, skip this one
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setError(null);
      setLoading(true);
      // If cache is recent (<15s), use it first to avoid blank state
      const now = Date.now();
      if (
        now - (GLOBAL_FINDMATCH_CACHE.lastFetch || 0) < 15000 &&
        (GLOBAL_FINDMATCH_CACHE.userDogs || []).length
      ) {
        setUserDogs(GLOBAL_FINDMATCH_CACHE.userDogs);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        // No user (or auth revalidating). Keep cached dogs if available and schedule a retry
        const hasCache = (GLOBAL_FINDMATCH_CACHE.userDogs || []).length > 0;
        if (hasCache) setUserDogs(GLOBAL_FINDMATCH_CACHE.userDogs);
        // Release the loading lock but keep the spinner on
        loadingRef.current = false;
        setTimeout(() => {
          // Re-attempt after a short delay
          fetchUserDogs();
        }, 700);
        return; // keep loading=true
      }
      const { data, error } = await supabase
        .from("dogs")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (requestIdRef.current !== myReq) return;
      setUserDogs(data || []);
      GLOBAL_FINDMATCH_CACHE.userDogs = data || [];
      GLOBAL_FINDMATCH_CACHE.lastFetch = Date.now();
      setLoading(false);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchUserDogs();

    // Restore state if coming back from a profile page
    if (location.state) {
      const { selectedDog: savedSelectedDog, potentialMatches: savedMatches } =
        location.state;
      if (savedSelectedDog) {
        setSelectedDog(savedSelectedDog);
      }
      if (savedMatches) {
        setPotentialMatches(savedMatches);
      }
    }
  }, [location.state, fetchUserDogs]);

  // Refresh dogs when tab gains focus / becomes visible
  useEffect(() => {
    const onFocus = () => setFocusedTick((t) => t + 1);
    const onVisibility = () => {
      if (document.visibilityState === "visible") setFocusedTick((t) => t + 1);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    // Debounce reload: only refetch if we have no dogs or cache is stale
    const stale = Date.now() - (GLOBAL_FINDMATCH_CACHE.lastFetch || 0) > 10000;
    if (!userDogs.length || stale) {
      (async () => {
        if (loadingRef.current) return;
        // mimic initial fetch flow
        await fetchUserDogs();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedTick]);

  // Long-loading detector to show helpful text if it takes too long
  useEffect(() => {
    let t1, t2;
    if (loading) {
      t1 = setTimeout(() => setSlowLoad(true), 2500);
      t2 = setTimeout(() => setVerySlowLoad(true), 8000);
    } else {
      setSlowLoad(false);
      setVerySlowLoad(false);
    }
    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [loading]);

  const handleSelectDog = async (dog) => {
    setSelectedDog(dog);
    setLoading(true);
    setError(null);
    setPotentialMatches([]);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("dogs")
      .select("*")
      .neq("gender", dog.gender) // Basic filtering for breeding compatibility
      .neq("user_id", user.id); // Exclude user's own dogs

    if (error) {
      setError(error.message);
    } else {
      const scoredMatches = data
        .map((match) => ({
          ...match,
          score: calculateMatchScore(dog, match),
        }))
        .filter((match) => match.score > 0) // Only show compatible matches
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, 3); // Get top 3 matches only
      setPotentialMatches(scoredMatches);
    }
    setLoading(false);
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
        {loading ? (
          <div className="loading-state" style={{ minHeight: 140 }}>
            <div className="loading-spinner" />
            <p>Loading your dogs…</p>
            {slowLoad && (
              <p className="text-sm" style={{ color: "#4b5563", marginTop: 6 }}>
                Still loading. This can happen right after switching tabs or on a slow
                connection. We’ll keep trying automatically.
              </p>
            )}
            {verySlowLoad && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                  className="primary-btn"
                  onClick={() => fetchUserDogs()}
                  type="button"
                >
                  Retry
                </button>
              </div>
            )}
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
                />
                <div className="dog-info">
                  <h3>{dog.name}</h3>
                  <p>{dog.breed}</p>
                  <div
                    className={
                      "gender-pill " +
                      (((dog.gender || dog.sex || "") + "").toString().toLowerCase() === "male"
                        ? "male"
                        : (((dog.gender || dog.sex || "") + "").toString().toLowerCase() === "female"
                          ? "female"
                          : "unknown"))
                    }
                    style={{ marginTop: 6 }}
                  >
                    {(() => {
                      const g = (dog.gender || dog.sex || "").toString();
                      const label = g ? g[0].toUpperCase() + g.slice(1).toLowerCase() : "—";
                      return <span className="gender-label">{label.toLowerCase()}</span>;
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

          {loading && (
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

          {!loading && potentialMatches.length === 0 && !error && (
            <div className="empty-state">
              <p>No compatible matches found at this time.</p>
            </div>
          )}

          {!loading && potentialMatches.length > 0 && (
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
