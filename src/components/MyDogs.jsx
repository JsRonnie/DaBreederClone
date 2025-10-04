import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import ConfirmDialog from "./ConfirmDialog";

export default function MyDogs({ dogs = [], onAddDog, userId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mine, setMine] = useState([]);
  const [uid, setUid] = useState(userId || null);
  const [lastFetch, setLastFetch] = useState(0);
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

  useEffect(() => {
    let active = true;

    async function load() {
      console.log("🐕 MyDogs: Starting load...", {
        uid,
        lastFetch,
        mine: mine.length,
        forceRefresh,
      });

      // Always load fresh data, reduce caching and also refetch on focus
      const now = Date.now();
      if (now - lastFetch < 5000 && mine.length > 0 && forceRefresh === 0) {
        console.log("🔄 Using cached data");
        setLoading(false);
        return;
      }

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
          setMine([]);
          setLastFetch(now);
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
        }));

        console.log("✅ Processed dogs:", processedDogs.length);
        setMine(processedDogs);
        setLastFetch(now);
      } catch (e) {
        console.error("💥 Load error:", e);
        setError(e.message || "Failed to load your dogs");
      } finally {
        if (active) setLoading(false);
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
  }, [uid, forceRefresh, lastFetch, mine.length, focusedTick]); // include focus ticks

  // Refetch when window gains focus
  useEffect(() => {
    const onFocus = () => setFocusedTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function addSampleDogs() {
    try {
      setError("");
      setLoading(true);
      let effectiveUserId = uid;
      if (!effectiveUserId) {
        const { data: u } = await supabase.auth.getUser();
        effectiveUserId = u?.user?.id || null;
        setUid(effectiveUserId);
      }
      if (!effectiveUserId)
        throw new Error("Please sign in to add sample dogs.");
      const sample = [
        {
          name: "Mr.brown",
          breed: "Great Dane",
          gender: "male",
          age_years: 8,
          size: "large",
        },
        {
          name: "Mango",
          breed: "Mastiff",
          gender: "male",
          age_years: 3,
          size: "small",
        },
        {
          name: "Ronnie",
          breed: "Boxer",
          gender: "male",
          age_years: 7,
          size: "medium",
        },
      ].map((d) => ({ ...d, user_id: effectiveUserId }));
      const { error: insErr } = await supabase.from("dogs").insert(sample);
      if (insErr) throw insErr;
      const { data, error: qErr } = await supabase
        .from("dogs")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("id", { ascending: false });
      if (qErr) throw qErr;
      setMine(
        (data || []).map((d) => ({
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
        }))
      );
    } catch (e) {
      console.error(e);
      const m = (e.message || "").toLowerCase();
      if (m.includes("permission denied"))
        setError(
          "Permission denied. Check RLS insert policy (user_id = auth.uid())."
        );
      else setError(e.message || "Failed to add sample dogs");
    } finally {
      setLoading(false);
    }
  }

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
            .from("dog-documents")
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
      setLastFetch(0); // Reset cache timestamp
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with title and add button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dogs</h1>
          <button
            onClick={onAddDog}
            className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2 shadow-sm"
          >
            <svg
              className="w-5 h-5"
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
            New Pet
          </button>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading your dogs…
          </div>
        ) : displayDogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
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
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No dogs yet
            </h3>
            <p className="text-gray-500 mb-6">
              Add your first dog to get started with breeding matches.
            </p>
            {userId && (
              <p className="text-xs text-slate-500 mb-2">
                (Filtering by your account id ending with …
                {String(userId).slice(-6)})
              </p>
            )}
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="mt-3">
              <button
                type="button"
                onClick={addSampleDogs}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Or add 3 sample dogs
              </button>
            </div>
            <button
              onClick={onAddDog}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
            >
              Add Your First Dog
            </button>
            <div className="mt-3" />
            {error && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-rose-600">{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-xs text-slate-600 hover:text-slate-900 underline"
                >
                  Retry
                </button>
              </div>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setForceRefresh((v) => v + 1)}
                className="text-xs text-slate-600 hover:text-slate-900 underline"
              >
                Refresh list
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayDogs.map((dog) => (
              <div
                key={dog.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                {/* Dog Photo */}
                <div className="h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={dog.image}
                    alt={dog.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEzMCA3MEwxNzAgMTEwTDE3MCAyMDBIMzBMMzAgMTEwTDcwIDcwTDEwMCAxMDBaIiBmaWxsPSIjRTVFN0VCIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHN2Zz4K";
                    }}
                  />
                </div>

                {/* Dog Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {dog.name}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p>{dog.breed}</p>
                    <p className="flex items-center gap-1">
                      {dog.age} •
                      {dog.sex?.toLowerCase() === "male" && (
                        <svg
                          className="w-4 h-4 ml-1 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9,9C10.29,9 11.5,9.41 12.47,10.11L17.58,5H13V3H21V11H19V6.41L13.89,11.5C14.59,12.5 15,13.7 15,15A6,6 0 0,1 9,21A6,6 0 0,1 3,15A6,6 0 0,1 9,9M9,11A4,4 0 0,0 5,15A4,4 0 0,0 9,19A4,4 0 0,0 13,15A4,4 0 0,0 9,11Z" />
                        </svg>
                      )}
                      {dog.sex?.toLowerCase() === "female" && (
                        <svg
                          className="w-4 h-4 ml-1 text-pink-500"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12,4A6,6 0 0,1 18,10A6,6 0 0,1 12,16A6,6 0 0,1 6,10A6,6 0 0,1 12,4M12,6A4,4 0 0,0 8,10A4,4 0 0,0 12,14A4,4 0 0,0 16,10A4,4 0 0,0 12,6M12,18.5A1,1 0 0,1 11,19.5V22.5A1,1 0 0,1 13,22.5V19.5A1,1 0 0,1 12,18.5M10.5,21H13.5V22H10.5V21Z" />
                        </svg>
                      )}
                      {dog.sex}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link
                      to={`/dog/${dog.id}`}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors duration-200 text-center"
                    >
                      View Profile
                    </Link>
                    <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors duration-200">
                      Find Match
                    </button>
                    <button
                      onClick={() => showDeleteConfirmation(dog.id, dog.name)}
                      className="px-3 py-2 bg-rose-600 text-white rounded-md text-sm font-medium hover:bg-rose-700 transition-colors duration-200"
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
