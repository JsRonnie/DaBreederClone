import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import ConfirmDialog from "./ConfirmDialog";
import "./DogCard.css";
import "../pages/FindMatchPage.css";

export default function MyDogs({ dogs = [], onAddDog, userId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mine, setMine] = useState([]);
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
  const dataCache = useRef({ dogs: [], lastFetch: 0, userId: null });

  useEffect(() => {
    let active = true;

    async function load() {
      // Prevent multiple simultaneous loads
      if (loadingRef.current) {
        console.log("� Load already in progress, skipping...");
        return;
      }

      console.log("�🐕 MyDogs: Starting load...", {
        uid,
        cacheLastFetch: dataCache.current.lastFetch,
        cacheLength: dataCache.current.dogs.length,
        forceRefresh,
      });

      const now = Date.now();
      const timeSinceLastFetch = now - dataCache.current.lastFetch;

      // Check cache - if we have recent data for the same user, use it
      if (
        dataCache.current.userId === uid &&
        timeSinceLastFetch < 15000 &&
        forceRefresh === 0 &&
        (dataCache.current.dogs.length > 0 || dataCache.current.lastFetch > 0)
      ) {
        console.log("🔄 Using cached data");
        if (active) {
          setMine(dataCache.current.dogs);
          setLoading(false);
        }
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setError("");
      try {
        let effectiveUserId = uid;
        // If no userId provided, try to read it from Supabase auth
        if (!effectiveUserId) {
          console.log("🔍 No uid provided, checking auth...");
          const { data: u, error: uErr } = await supabase.auth.getUser();
          if (uErr) throw uErr;
          effectiveUserId = u?.user?.id || null;
          setUid(effectiveUserId);
          console.log("👤 Got user ID from auth:", effectiveUserId);
        }
        if (!effectiveUserId) {
          console.log("❌ No user ID available");
          if (active) {
            setMine([]);
            dataCache.current = {
              dogs: [],
              lastFetch: now,
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

        console.log("📈 Query result:", {
          data: data?.length || 0,
          error: qErr,
        });
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
        if (!active) return;
        const processedDogs = (data || []).map((d) => ({
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
          image: d.image_url || "/heroPup.jpg",
          hidden: d.hidden || false,
        }));

        console.log("✅ Processed dogs:", processedDogs.length);
        setMine(processedDogs);
        dataCache.current = {
          dogs: processedDogs,
          lastFetch: now,
          userId: effectiveUserId,
        };
      } catch (e) {
        console.error("💥 Load error:", e);
        setError(e.message || "Failed to load your dogs");
        dataCache.current = { dogs: [], lastFetch: now, userId: uid };
      } finally {
        if (active) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    }

    load();
    // Safety timeout so UI doesn't appear stuck if something unforeseen happens
    const t = setTimeout(() => {
      if (active) setLoading(false);
    }, 6000);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [uid, forceRefresh, focusedTick]); // Removed lastFetch and mine.length to prevent infinite loops

  // Refetch when window gains focus
  useEffect(() => {
    const onFocus = () => setFocusedTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

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
                    src={dog.image}
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
                      <span className="detail-value capitalize">{dog.sex}</span>
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
