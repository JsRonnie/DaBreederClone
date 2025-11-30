import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { safeGetUser } from "../lib/auth";
import { calculateMatchScore } from "../utils/matchmaking";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import { createCache } from "../lib/cache";
import { getCookie, setCookie } from "../utils/cookies";
import useDogs from "../hooks/useDogs";
import LoadingState from "../components/LoadingState";
import { ensureContact } from "../lib/chat";
import { fetchAwaitingDogIds } from "../lib/matches";
import ScoringInfoModal from "../components/ScoringInfoModal";
import "./FindMatchPage.css"; // warm dog-lover theme

// Shared invalidation timestamp is managed inside useDogs; keep usage here only for matches caching.

export default function FindMatchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser } = useContext(AuthContext);

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (authUser && authUser.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [authUser, navigate]);

  // Set page title
  useEffect(() => {
    document.title = "Find Matches 🐾 | DaBreeder";
  }, []);

  // Debug logger for this page
  const FM_LOG = (...args) => console.log("🔎 [FindMatch]", ...args);
  const MATCHES_TTL = 15 * 60 * 1000; // 15 minutes
  const matchesCache = useRef(
    createCache("match-cache", {
      storage: "sessionStorage",
      defaultTTL: MATCHES_TTL,
    })
  );
  const { dogs: myDogs, loading: dogsLoading } = useDogs();
  const userDogs = useMemo(
    () =>
      (myDogs || [])
        .filter((d) => d.is_visible !== false)
        .map((d) => ({
          id: d.id,
          name: d.name,
          breed: d.breed,
          gender: d.gender || d.sex || null,
          sex: d.sex || d.gender || null,
          size: d.size || null,
          weight_kg: d.weight_kg ?? null,
          coat_type: d.coat_type || null,
          color: d.color || null,
          activity_level: d.activity_level || null,
          sociability: d.sociability || null,
          trainability: d.trainability || null,
          image_url: d.image || d.image_url || null,
          hidden: typeof d.hidden === "boolean" ? d.hidden : d.is_visible === false,
          is_visible: d.is_visible ?? true,
          user_id: d.user_id,
        })),
    [myDogs]
  );
  const [selectedDog, setSelectedDog] = useState(null);
  const selectedDogIdRef = useRef(null);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]); // Store all matches
  const [displayCount, setDisplayCount] = useState(3); // How many to show
  const [breedFilter, setBreedFilter] = useState("mixed"); // "same" or "mixed"
  // Split loading states so selecting a dog doesn't reload the dog grid/card
  const [matchesLoading, setMatchesLoading] = useState(false);
  // Simplified loading UI (no long-load hints)
  const [error, setError] = useState(null);
  const [contactingDogId, setContactingDogId] = useState(null);
  const [showScoringInfo, setShowScoringInfo] = useState(false);
  const matchesRequestIdRef = useRef(0);
  const filterUnavailableMatches = useCallback(async (matches) => {
    if (!Array.isArray(matches) || matches.length === 0) return matches || [];
    try {
      const awaitingSet = await fetchAwaitingDogIds(matches.map((m) => m.id));
      if (!awaitingSet.size) return matches;
      return matches.filter((m) => !awaitingSet.has(String(m.id)));
    } catch (err) {
      console.error("Failed to filter awaiting dogs", err);
      return matches;
    }
  }, []);
  useEffect(() => {
    // Clear match cache on mount to ensure updated calculation logic is used
    if (matchesCache.current) {
      matchesCache.current.clear();
      FM_LOG("Match cache cleared on mount");
    }
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
          setAllMatches(stateMatches);
          setPotentialMatches(stateMatches.slice(0, 3));
          setDisplayCount(3);
          setMatchesLoading(false);
        } else {
          try {
            const cached = matchesCache.current.get(`matches:${savedSelectedDog.id}`);
            if (Array.isArray(cached) && cached.length > 0) {
              FM_LOG("restore: potentialMatches from cache", cached.length);
              setAllMatches(cached);
              setPotentialMatches(cached.slice(0, 3));
              setDisplayCount(3);
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
  }, [location.state]);

  // If a dog id was restored from cookie, select it once dogs are available
  useEffect(() => {
    if (!dogsLoading && selectedDogIdRef.current && !selectedDog && userDogs.length) {
      const match = userDogs.find((d) => String(d.id) === String(selectedDogIdRef.current));
      if (match) setSelectedDog(match);
    }
  }, [dogsLoading, userDogs, selectedDog]);

  // Removed focus/visibility-based auto refresh; we rely on global invalidation from add/edit/delete only

  // Removed long-loading detector and retry UI for a cleaner experience

  // Filter matches based on breedFilter
  const getFilteredMatches = (matches, selectedDog, filterType) => {
    if (!selectedDog) return [];
    if (filterType === "same") {
      return matches.filter((m) => m.breed === selectedDog.breed);
    }
    return matches;
  };

  const handleBreedFilterChange = (e) => {
    const value = e.target.value;
    setBreedFilter(value);
    // Update displayed matches when filter changes
    setPotentialMatches(getFilteredMatches(allMatches, selectedDog, value).slice(0, displayCount));
  };

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
    function buildQuery({ visibilityFilter, orderBy, includeUserId }) {
      let q = supabase.from("dogs").select("*").limit(200);
      if (orderBy) q = q.order(orderBy, { ascending: false });
      // Exclude my own dogs when possible (and column exists)
      if (includeUserId && user?.id) q = q.neq("user_id", user.id);
      // Filter out hidden dogs using whichever column exists on this deployment
      if (visibilityFilter === "is_visible") q = q.eq("is_visible", true);
      if (visibilityFilter === "hidden") q = q.eq("hidden", false);
      return q;
    }

    async function runAdaptiveMatchesQuery() {
      // Start optimistic and then adapt based on specific error messages
      let opts = {
        visibilityFilter: "is_visible",
        orderBy: null,
        includeUserId: true,
      };
      for (let i = 0; i < 8; i++) {
        const res = await buildQuery(opts);
        const resp = await res;
        if (!resp.error) return resp;
        const em = (resp.error.message || resp.error.details || "").toLowerCase();
        // Switch visibility filtering strategy based on available columns
        if (
          opts.visibilityFilter === "is_visible" &&
          /is_visible/.test(em) &&
          /does not exist|42703|column/.test(em)
        ) {
          opts.visibilityFilter = "hidden";
          continue;
        }
        if (
          opts.visibilityFilter === "hidden" &&
          /hidden/.test(em) &&
          /does not exist|42703|column/.test(em)
        ) {
          opts.visibilityFilter = null;
          continue;
        }
        // Drop user_id filter if column missing
        if (opts.includeUserId && /user_id/.test(em) && /does not exist|42703|column/.test(em)) {
          opts.includeUserId = false;
          continue;
        }
        // No ordering used initially to avoid 400s from unknown order columns
        // No known remediation left
        return resp;
      }
      // Fallback: last attempt without any optional filters/order
      return await buildQuery({
        visibilityFilter: null,
        orderBy: null,
        includeUserId: false,
      });
    }

    const myReq = ++matchesRequestIdRef.current;
    // Cache-first: if we have cached matches for this dog, use them
    const cached = matchesCache.current.get(`matches:${dog.id}`);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      // Recalculate scores for cached matches using latest logic
      const rescored = cached
        .map((match) => ({
          ...match,
          score: calculateMatchScore(dog, match),
        }))
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score);
      const filteredCached = await filterUnavailableMatches(rescored);
      FM_LOG("matches: using rescored cached", filteredCached.length, "(raw:", cached.length, ")");
      setAllMatches(filteredCached);
      setPotentialMatches(getFilteredMatches(filteredCached, dog, breedFilter).slice(0, 3));
      setDisplayCount(3); // Reset display count
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
    const selectedGenderValue = (dog.gender || dog.sex || "").toString().toLowerCase();
    const genderFilteredRows = selectedGenderValue
      ? rows.filter((match) => {
          const matchGender = (match.gender || match.sex || "").toString().toLowerCase();
          return matchGender ? matchGender !== selectedGenderValue : true;
        })
      : rows;
    FM_LOG("matches: fetched rows", rows.length);
    const scoredMatches = genderFilteredRows
      .map((match) => ({
        ...match,
        score: calculateMatchScore(dog, match),
      }))
      .filter((match) => match.score > 0) // Only show compatible matches
      .sort((a, b) => b.score - a.score); // Sort by score descending

    FM_LOG("matches: scored", {
      total: rows.length,
      shown: scoredMatches.length,
      top: scoredMatches.map((m) => ({ id: m.id, score: m.score })).slice(0, 3),
    });
    const availableMatches = await filterUnavailableMatches(scoredMatches);
    if (matchesRequestIdRef.current === myReq) {
      setAllMatches(availableMatches);
      setPotentialMatches(getFilteredMatches(availableMatches, dog, breedFilter).slice(0, 3));
      setDisplayCount(3); // Reset display count
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

  const handleContact = async (match) => {
    if (!authUser) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Please sign in to contact the owner", type: "warning" },
        })
      );
      return;
    }
    if (!selectedDog) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Select one of your dogs before contacting a match", type: "warning" },
        })
      );
      return;
    }
    let ownerId = match?.user_id || null;

    setContactingDogId(match.id);
    try {
      if (!ownerId) {
        const { data, error } = await supabase
          .from("dogs")
          .select("user_id")
          .eq("id", match.id)
          .maybeSingle();
        if (error) throw error;
        ownerId = data?.user_id || null;
      }

      if (!ownerId) {
        throw new Error("Owner not available for this match. Please try another dog or refresh.");
      }

      // Check if a conversation already exists between these two dogs (in either direction)
      const { data: existingContacts, error: searchError } = await supabase
        .from("contacts")
        .select("*")
        .or(
          `and(my_dog_id.eq.${selectedDog.id},dog_id.eq.${match.id}),and(my_dog_id.eq.${match.id},dog_id.eq.${selectedDog.id})`
        );

      if (searchError) {
        console.error("Error checking for existing contact:", searchError);
      }

      let contactId;

      // If conversation exists, just navigate to it (don't update anything)
      if (existingContacts && existingContacts.length > 0) {
        contactId = existingContacts[0].id;
        console.log("Found existing conversation, navigating to it:", contactId);
      } else {
        // Create ONE shared contact that both users can see
        contactId = await ensureContact({
          dogId: match.id,
          dogName: match.name,
          dogImage: match.image_url || null,
          ownerId,
        });

        // Update the contact with the selected dog info
        await supabase
          .from("contacts")
          .update({
            my_dog_id: selectedDog.id,
            my_dog_name: selectedDog.name,
            my_dog_image: selectedDog.image_url || null,
          })
          .eq("id", contactId);

        console.log("Successfully created contact:", contactId);
      }

      navigate(`/chat/${contactId}`, {
        state: {
          fromFindMatch: true,
          selectedDogId: selectedDog.id,
          contactedDogId: match.id,
        },
      });
    } catch (err) {
      console.error("Failed to start contact", err);
      const message = err?.message || "We couldn't open the chat. Please try again.";
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message, type: "error" },
        })
      );
    } finally {
      setContactingDogId(null);
    }
  };

  const handleViewMore = () => {
    const newCount = displayCount + 3;
    setDisplayCount(newCount);
    setPotentialMatches(
      getFilteredMatches(allMatches, selectedDog, breedFilter).slice(0, newCount)
    );
  };

  return (
    <>
      <div className="find-match-container">
        {/* Header Section */}
        <div className="header-section">
          <h1 className="page-title">Find Matches</h1>
          <p className="page-description">Find compatible breeding partners for your dogs</p>
        </div>

        {/* Dog Selection Section */}
        <div className="content-section">
          <div className="section-title-row">
            <h2 className="section-title">Select Your Dog</h2>
            <button
              type="button"
              className="section-info-btn"
              onClick={() => setShowScoringInfo(true)}
              aria-label="Learn how the compatibility score works"
              title="Click to learn more about the breeding progress"
            >
              How Matching Works
            </button>
          </div>
          {dogsLoading && userDogs.length === 0 ? (
            <LoadingState message="Loading your dogs..." minHeight={140} />
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
                  className={`dog-card ${selectedDog?.id === dog.id ? "selected" : ""}`}
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
                        (((dog.gender || dog.sex || "") + "").toString().toLowerCase() === "male"
                          ? "male"
                          : ((dog.gender || dog.sex || "") + "").toString().toLowerCase() ===
                              "female"
                            ? "female"
                            : "unknown")
                      }
                      style={{ marginTop: 6 }}
                    >
                      {(() => {
                        const g = (dog.gender || dog.sex || "").toString();
                        const label = g ? g[0].toUpperCase() + g.slice(1).toLowerCase() : "\u2014";
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
            <div className="matches-header">
              <h2 className="section-title">Matches for {selectedDog.name}</h2>
              <div className="filter-group">
                <label style={{ fontWeight: "bold", marginRight: "1rem", color: "#4B5563" }}>
                  Filter:
                </label>
                <label className={"filter-label" + (breedFilter === "same" ? " active" : "")}>
                  <input
                    type="radio"
                    name="breedFilter"
                    value="same"
                    checked={breedFilter === "same"}
                    onChange={handleBreedFilterChange}
                    style={{ accentColor: "#6366F1", marginRight: "0.5rem" }}
                  />
                  <span
                    style={{
                      color: breedFilter === "same" ? "#6366F1" : "#4B5563",
                      fontWeight: "500",
                    }}
                  >
                    Same Breed
                  </span>
                </label>
                <label className={"filter-label" + (breedFilter === "mixed" ? " active" : "")}>
                  <input
                    type="radio"
                    name="breedFilter"
                    value="mixed"
                    checked={breedFilter === "mixed"}
                    onChange={handleBreedFilterChange}
                    style={{ accentColor: "#6366F1", marginRight: "0.5rem" }}
                  />
                  <span
                    style={{
                      color: breedFilter === "mixed" ? "#6366F1" : "#4B5563",
                      fontWeight: "500",
                    }}
                  >
                    Mixed Breed
                  </span>
                </label>
              </div>
            </div>

            {matchesLoading && <LoadingState message="Finding matches..." minHeight={120} />}

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
              <>
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
                            <span className="detail-value capitalize">{match.breed}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Age</span>
                            <span className="detail-value">{match.age_years} years old</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Gender</span>
                            <span className="detail-value capitalize">{match.gender}</span>
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
                            disabled={contactingDogId === match.id}
                          >
                            {contactingDogId === match.id ? "Opening chat..." : "Contact Owner"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* View More button */}
                {displayCount < getFilteredMatches(allMatches, selectedDog, breedFilter).length && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
                    <button
                      className="primary-btn"
                      onClick={handleViewMore}
                      style={{
                        padding: "0.75rem 2rem",
                        fontSize: "1rem",
                        fontWeight: "500",
                      }}
                    >
                      View More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <ScoringInfoModal open={showScoringInfo} onClose={() => setShowScoringInfo(false)} />
    </>
  );
}
