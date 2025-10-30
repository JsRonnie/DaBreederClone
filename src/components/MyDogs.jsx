import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import ConfirmDialog from "./ConfirmDialog";
import "./DogCard.css";
import "../pages/FindMatchPage.css";

// Lightweight module-level cache so data survives unmount/remounts within the app session.
// Keyed by userId to keep per-user results separate. We store it on globalThis so
// it persists across HMR / module reloads during development and is not reinitialized
// on every import.
const GLOBAL_DOG_CACHE = (globalThis.__DB_GLOBAL_DOG_CACHE__ = globalThis.__DB_GLOBAL_DOG_CACHE__ || {});

export default function MyDogs({ dogs = [], onAddDog, userId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Initialize from module cache so remounting the component shows data immediately
  const [mine, setMine] = useState(() => {
    try {
      return (GLOBAL_DOG_CACHE[userId] && GLOBAL_DOG_CACHE[userId].dogs) || [];
    } catch (e) {
      return [];
    }
  });
  const [uid, setUid] = useState(userId || null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [focusedTick, setFocusedTick] = useState(0);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    dogId: null,
    dogName: "",
  });

  // Keep internal uid in sync with prop
  useEffect(() => {
    setUid(userId || null);
  }, [userId]);

  // Function to force refresh data (useful after adding a dog)
  // Removed unused refreshData function to fix compile error

  const displayDogs = useMemo(() => {
    if (dogs.length > 0) return dogs;
    return mine;
  }, [dogs, mine]);

  // Use a ref to track if we're currently loading to prevent multiple simultaneous loads
  const loadingRef = useRef(false);
  // Use a ref so we can mutate without triggering re-renders. Initialize from the
  // module-level cache (if present) so that unmounting the component doesn't lose
  // already-fetched dog lists when the user navigates away and back.
  const dataCache = useRef(
    GLOBAL_DOG_CACHE[userId] || { dogs: [], lastFetch: 0, userId: userId || null }
  );

  // Keep dataCache in sync when uid changes so we reuse cached results for the
  // newly-set user id immediately.
  useEffect(() => {
    try {
      dataCache.current = GLOBAL_DOG_CACHE[uid] || { dogs: [], lastFetch: 0, userId: uid || null };
      if (Array.isArray(dataCache.current.dogs) && dataCache.current.dogs.length > 0) {
        setMine(dataCache.current.dogs);
      }
    } catch (e) {
      // ignore
    }
  }, [uid]);

  const requestIdRef = useRef(0);

  useEffect(() => {
    async function load() {
      // Each invocation gets a unique request id; only the latest one is allowed to commit results.
      const myReqId = ++requestIdRef.current;
      // Prevent multiple simultaneous loads. If another load is in progress,
      // wait (poll) up to 2s for it to finish and then re-check. This avoids
      // starting overlapping queries that can race and clear state.
      if (loadingRef.current) {
        console.log("� Load already in progress, waiting for it to finish...");
        const start = Date.now();
        while (loadingRef.current && Date.now() - start < 2000) {
          await new Promise((r) => setTimeout(r, 100));
        }
        // If the prior load completed, proceed with this load (it will become the latest request).
      }

      console.log("�🐕 MyDogs: Starting load...", {
        uid,
        cacheLastFetch: dataCache.current.lastFetch,
        cacheLength: dataCache.current.dogs.length,
        forceRefresh,
      });

  const now = Date.now();
  const timeSinceLastFetch = now - dataCache.current.lastFetch;
  const desiredUserId = userId || uid;

      // Check cache - if we have recent data for the same user, use it
        if (
        dataCache.current.userId === desiredUserId &&
        timeSinceLastFetch < 15000 &&
        forceRefresh === 0 &&
        (dataCache.current.dogs.length > 0 || dataCache.current.lastFetch > 0)
      ) {
        console.log("🔄 Using cached data");
        if (requestIdRef.current === myReqId) {
          setMine(dataCache.current.dogs);
          setLoading(false);
        }
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setError("");
      try {
        // Prefer an explicit `userId` prop if available; fall back to internal uid.
        let effectiveUserId = userId || uid;
        // If neither prop nor state provide a uid, try to read it from Supabase auth
        if (!effectiveUserId) {
          console.log("🔍 No uid provided by prop/state, checking auth...");
          const { data: u, error: uErr } = await supabase.auth.getUser();
          if (uErr) {
            console.warn("Auth getUser error:", uErr);
            // Only treat certain token errors as fatal. Don't clear previously-fetched
            // data here — that can cause the UI to empty when the auth system is
            // briefly revalidating tokens (e.g. after a background tab switch).
            const msg = (uErr.message || "").toLowerCase();
            if (msg.includes("invalid refresh token") || msg.includes("refresh token not found")) {
              try {
                // Best-effort cleanup of any stale session
                await supabase.auth.signOut();
              } catch (sErr) {
                console.warn("Failed to sign out during token cleanup:", sErr);
              }
              setError("Session expired. Please sign in again.");
              // do not aggressively clear cache here — just set loading false and bail
              if (active) {
                setLoading(false);
              }
              loadingRef.current = false;
              return;
            }
            // For other auth/getUser errors, continue and allow fallback to provided uid (if any)
            // but surface a warning.
          }
          effectiveUserId = u?.user?.id || null;
          // Only update internal uid when a prop wasn't explicitly provided.
          if (!userId) setUid(effectiveUserId);
          console.log("👤 Got user ID from auth:", effectiveUserId);
        }
        if (!effectiveUserId) {
          console.log("❌ No user ID available");
          // If there's cached data for a previous user session, keep showing it briefly
          // instead of immediately clearing the UI. But we still stop further querying.
          if (requestIdRef.current === myReqId) {
            const cached = dataCache.current?.dogs || [];
            if (cached.length > 0) {
              setMine(cached);
            } else {
              setMine([]);
            }
            // update module cache as well
            GLOBAL_DOG_CACHE[effectiveUserId] = {
              dogs: dataCache.current?.dogs || [],
              lastFetch: dataCache.current?.lastFetch || now,
              userId: effectiveUserId,
            };
            setLoading(false);
          }
          return;
        }

        console.log("📊 Querying dogs for user:", effectiveUserId);
        let { data, error: qErr } = await supabase
          .from("dogs")
          // Select all columns to avoid errors if some optional columns (like image_url) don't exist yet
          .select("*")
          .eq("user_id", effectiveUserId)
          // Order by id to be robust even if created_at isn't present yet
          .order("id", { ascending: false });

  // Log raw result for debugging when users report empty lists
  console.log("📈 Query completed. raw data (typeof):", typeof data, Array.isArray(data), "len:", data?.length, data, "error:", qErr);
        if (qErr) {
          const msg = (qErr.message || "").toLowerCase();
          // If user_id column doesn't exist, fall back to showing all dogs (dev-friendly)
          if (msg.includes("user_id") && msg.includes("does not exist")) {
            const fallback = await supabase
              .from("dogs")
              .select("*")
              .order("id", { ascending: false });
            if (fallback.error) throw fallback.error;
            data = fallback.data;
            setError(
              "Note: 'user_id' column missing. Showing all dogs. Add a user_id uuid column to filter per-user."
            );
          } else if (
            msg.includes("permission denied") ||
            msg.includes("not allowed")
          ) {
            throw new Error(
              "Permission denied when reading dogs. If Row Level Security is ON, add select policy: user_id = auth.uid()."
            );
          } else {
            throw qErr;
          }
        }
        // Only the latest request should commit results.
        if (requestIdRef.current !== myReqId) return;
        let processedDogs = [];
        try {
          console.log("🔧 Mapping raw rows to processedDogs...", (data || []).length);
          processedDogs = (data || []).map((d) => ({
          id: d.id,
          name:
            typeof d.name === "string"
              ? d.name
              : d.name
              ? String(d.name)
              : "Unnamed",
          breed:
            typeof d.breed === "string"
              ? d.breed
              : d.breed
              ? String(d.breed)
              : "Unknown",
          age:
            d.age_years && typeof d.age_years === "number"
              ? `${d.age_years} years`
              : d.age_years && !isNaN(Number(d.age_years))
              ? `${Number(d.age_years)} years`
              : "—",
          sex:
            d.gender && typeof d.gender === "string"
              ? d.gender[0].toUpperCase() + d.gender.slice(1)
              : "—",
          // Accept either image_url (raw DB row) or image (already-normalized)
          image: d.image || d.image_url || "/heroPup.jpg",
          hidden: d.hidden || false,
        }));
        } catch (mapErr) {
          console.error("❌ Error processing dog rows:", mapErr, "raw data:", data);
          // Fallback: if rows exist but mapping failed, try a simpler pass-through
          if (Array.isArray(data) && data.length > 0) {
            processedDogs = data.map((d, i) => ({
              id: d.id ?? `row-${i}`,
              name: (d.name && String(d.name)) || `Dog ${i + 1}`,
              breed: (d.breed && String(d.breed)) || "Unknown",
              age: (d.age_years && `${d.age_years} years`) || "—",
              sex: (d.gender && String(d.gender)) || "—",
              image: d.image || d.image_url || "/heroPup.jpg",
              hidden: !!d.hidden,
            }));
          }
        }

  console.log("✅ Processed dogs (before set):", processedDogs.length, processedDogs.slice(0, 3));
  // Force a shallow copy when setting state to avoid any reference quirk
        const newDogs = Array.isArray(processedDogs) ? [...processedDogs] : processedDogs;
        setMine(newDogs);
        console.log("🔁 mine state set (shallow copy applied)");
        dataCache.current = {
          dogs: newDogs,
          lastFetch: now,
          userId: effectiveUserId,
        };
        // Also persist to the module-level cache so remounts can reuse it
        try {
          GLOBAL_DOG_CACHE[effectiveUserId] = { ...dataCache.current };
        } catch (e) {
          // Non-fatal if writing to module cache fails for any reason
          console.warn("Failed to persist to GLOBAL_DOG_CACHE:", e);
        }
      } catch (e) {
        console.error("💥 Load error:", e);
        setError(e.message || "Failed to load your dogs");
        // Do not clear previously-cached dogs here; that can cause the UI to
        // flash an empty state when transient errors occur (e.g., network/auth).
        // Keep dataCache.current as-is so the UI can continue displaying last-known data.
      } finally {
        if (requestIdRef.current === myReqId) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    }

    load();
    // Safety timeout so UI doesn't appear stuck if something unforeseen happens
    const t = setTimeout(() => {
      // Only the latest request should be able to toggle loading via timeout.
      setLoading(false);
    }, 6000);
    return () => {
      clearTimeout(t);
    };
  }, [uid, userId, forceRefresh, focusedTick]); // include userId so loads fire when prop changes

  // Refetch when window gains focus
  useEffect(() => {
    const onFocus = () => {
      console.log("📣 window focus detected - triggering reload");
      setFocusedTick((t) => t + 1);
    };

    // Also listen for visibilitychange so switching browser tabs (same window)
    // triggers a refetch when the document becomes visible again. Some browsers
    // don't fire window 'focus' when switching tabs, only document visibility.
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        console.log("📣 document became visible - triggering reload");
        setFocusedTick((t) => t + 1);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Debug: log displayDogs whenever it changes to see what will render
  useEffect(() => {
    console.log("🖥️ displayDogs changed: len=", displayDogs.length, displayDogs.slice(0, 5));
  }, [displayDogs]);

  // Function to show confirmation dialog
  function showDeleteConfirmation(dogId, dogName) {
    console.log("🗑️ Delete button clicked:", { dogId, dogName });
    setConfirmDialog({
      isOpen: true,
      dogId,
      dogName,
    });
    console.log("✅ Confirm dialog state updated");
  }

  // Function to close confirmation dialog
  function closeDeleteConfirmation() {
    console.log("🚪 Closing confirmation dialog");
    setConfirmDialog({
      isOpen: false,
      dogId: null,
      dogName: "",
    });
    console.log("✅ Dialog closed");
  }

  async function handleDeleteDog() {
    console.log("🚨 Delete confirmation clicked");
    console.log(
      "📋 Full dialog state:",
      JSON.stringify(confirmDialog, null, 2)
    );

    const { dogId, dogName } = confirmDialog;
    console.log("� Extracted values:", { dogId, dogName, type: typeof dogId });

    if (!dogId) {
      console.error("❌ No dogId found in dialog state!");
      closeDeleteConfirmation();
      return;
    }

    try {
      setError("");
      console.log(`🗑️ Deleting dog with ID: ${dogId}`);

      // Step 1: Get associated documents before deleting
      console.log("📄 Fetching dog documents...");
      const { data: documents, error: docFetchError } = await supabase
        .from("dog_documents")
        .select("file_path")
        .eq("dog_id", dogId);

      if (docFetchError) {
        console.warn("⚠️ Could not fetch documents:", docFetchError);
      }

      // Step 2: Delete files from storage (photos and documents)
      console.log("🗂️ Deleting storage files...");

      // Delete all photos for this dog (they're stored in dogId/ folder)
      const { data: photoList, error: PHOTO_LIST_ERROR } =
        await supabase.storage.from("dog-photos").list(`${dogId}`);

      if (photoList && photoList.length > 0) {
        const photoPaths = photoList.map((file) => `${dogId}/${file.name}`);
        console.log(`📸 Deleting ${photoPaths.length} photos:`, photoPaths);
        const { error: photoDelError } = await supabase.storage
          .from("dog-photos")
          .remove(photoPaths);
        if (photoDelError) {
          console.warn("⚠️ Could not delete some photos:", photoDelError);
        }
      }

      // Delete document files
      if (documents && documents.length > 0) {
        const docPaths = documents.map((doc) => doc.file_path).filter(Boolean);
        if (docPaths.length > 0) {
          console.log(`📋 Deleting ${docPaths.length} documents:`, docPaths);
          const { error: docDelError } = await supabase.storage
            .from("documents")
            .remove(docPaths);
          if (docDelError) {
            console.warn("⚠️ Could not delete some documents:", docDelError);
          }
        }
      }

      // Step 3: Delete document records from database
      console.log("🗄️ Deleting document records...");
      const { error: docRecordError } = await supabase
        .from("dog_documents")
        .delete()
        .eq("dog_id", dogId);

      if (docRecordError) {
        console.warn("⚠️ Could not delete document records:", docRecordError);
      }

      // Step 4: Finally delete the dog record
      console.log("🐕 Deleting dog record...");
      const { error: delErr } = await supabase
        .from("dogs")
        .delete()
        .eq("id", dogId);
      if (delErr) {
        console.error("❌ Supabase delete error:", delErr);
        throw delErr;
      }

      console.log(
        `✅ Successfully deleted dog and all associated files: ${dogName}`
      );

      // Update local state to remove the deleted dog
      setMine((prev) => {
        const filtered = prev.filter((d) => d.id !== dogId);
        console.log(
          `🔄 Updated local dogs: ${prev.length} → ${filtered.length}`
        );
        return filtered;
      });

      // Force refresh to reload data immediately after deletion
      dataCache.current = { dogs: [], lastFetch: 0, userId: null }; // Reset cache
      setForceRefresh((prev) => prev + 1);

      // Close the dialog
      console.log("🚪 Closing dialog...");
      closeDeleteConfirmation();

      // Show success message
      setTimeout(() => {
        alert(`${dogName}'s profile has been successfully deleted.`);
      }, 100);

      // Nudge a refetch shortly after to ensure UI stays in sync
      setTimeout(() => setForceRefresh((v) => v + 1), 300);
    } catch (e) {
      console.error("❌ Delete error:", e);
      setError(e.message || "Failed to delete dog");
      closeDeleteConfirmation();
    }
  }

  // Function to toggle hidden status of a dog
  async function handleToggleHidden(dogId, dogName, currentHiddenStatus) {
    try {
      setError("");
      console.log(`👁️ Toggling hidden status for ${dogName} (ID: ${dogId})`);

      const newHiddenStatus = !currentHiddenStatus;

      // Update the database
      const { error: updateError } = await supabase
        .from("dogs")
        .update({ hidden: newHiddenStatus })
        .eq("id", dogId);

      if (updateError) {
        console.error("❌ Supabase update error:", updateError);
        throw updateError;
      }

      console.log(
        `✅ Successfully ${
          newHiddenStatus ? "hidden" : "shown"
        } ${dogName}'s profile`
      );

      // Update local state
      setMine((prev) => {
        const updated = prev.map((d) =>
          d.id === dogId ? { ...d, hidden: newHiddenStatus } : d
        );
        console.log(`🔄 Updated local dog status for ${dogName}`);
        return updated;
      });

      // Show success message
      setTimeout(() => {
        alert(
          `${dogName}'s profile has been ${
            newHiddenStatus ? "hidden" : "shown"
          }.`
        );
      }, 100);
    } catch (e) {
      console.error("❌ Toggle hidden error:", e);
      setError(e.message || "Failed to update dog visibility");
    }
  }

  return (
    <div className="find-match-container">
      {/* Header Section */}
      <div className="header-section">
        <h1 className="page-title">My Dogs</h1>
        <p className="page-description">
          Manage your dog profiles and find perfect breeding matches
        </p>
      </div>

      

      {/* Main Content */}
      <div className="content-section">
        {loading ? (
          <div className="loading-state-modern">
            <div className="loading-spinner-modern"></div>
            <p>Loading your dogs...</p>
          </div>
        ) : displayDogs.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-state-icon">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="empty-state-title">No dogs yet</h3>
            <p className="empty-state-description">
              Add your first dog to get started with breeding matches and
              connect with other dog owners.
            </p>

            {userId && (
              <p className="text-xs text-slate-500 mb-4">
                Filtering by your account (ID: ...{String(userId).slice(-6)})
              </p>
            )}

            <div className="space-y-4">
              <button
                onClick={onAddDog}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50"
              >
                <svg
                  className="w-6 h-6 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Your First Dog
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200"></div>
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-500 mt-2">
                  🐾 Start building your dog's profile and find the perfect
                  match!
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="text-xs text-red-700 hover:text-red-900 underline"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setForceRefresh((v) => v + 1)}
                    className="text-xs text-red-700 hover:text-red-900 underline"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="matches-grid">
            {displayDogs.map((dog) => (
              <div
                key={dog.id}
                className={`match-card ${dog.hidden ? "hidden-dog" : ""}`}
              >
                {dog.hidden && <div className="match-rank">Hidden</div>}

                <div className="card-image-wrapper">
                  <img
                    src={dog.image || dog.image_url || "/heroPup.jpg"}
                    alt={dog.name}
                    className="match-image"
                    onError={(e) => {
                      e.target.src = "/heroPup.jpg";
                    }}
                  />
                </div>

                <div className="card-content">
                  <h3 className="match-name">{dog.name}</h3>
                  <div className="match-details">
                    <div className="detail-item">
                      <span className="detail-label">Breed</span>
                      <span className="detail-value capitalize">
                        {dog.breed}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Age</span>
                      <span className="detail-value">{dog.age}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Gender</span>
                        <span className="detail-value">
                          <div
                            className={
                              "gender-pill " +
                              ((dog.sex || dog.gender || "").toString().toLowerCase() ===
                              "male"
                                ? "male"
                                : (dog.sex || dog.gender || "").toString().toLowerCase() ===
                                  "female"
                                ? "female"
                                : "unknown")
                            }
                          >
                            {(() => {
                              const g = (dog.sex || dog.gender || "").toString();
                              const label = g
                                ? g[0].toUpperCase() + g.slice(1).toLowerCase()
                                : "—";
                              return <span className="gender-label">{label.toLowerCase()}</span>;
                            })()}
                          </div>
                        </span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <Link to={`/dog/${dog.id}`} className="view-profile-btn">
                      View Profile
                    </Link>

                    <button
                      onClick={() =>
                        handleToggleHidden(dog.id, dog.name, dog.hidden)
                      }
                      className={
                        dog.hidden ? "view-profile-btn" : "contact-btn"
                      }
                    >
                      {dog.hidden ? "Show" : "Hide"}
                    </button>
                  </div>

                  <div className="delete-button-container">
                    <button
                      onClick={() => showDeleteConfirmation(dog.id, dog.name)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeDeleteConfirmation}
        onConfirm={handleDeleteDog}
        title="Delete Dog Profile"
        message={`Are you sure you want to delete ${confirmDialog.dogName}'s profile?

This action cannot be undone and will permanently remove all information, photos, and documents for this dog.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
}
