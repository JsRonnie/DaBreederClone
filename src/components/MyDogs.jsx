import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import { removeAllDocumentsForDog } from "../lib/dogDocuments";
import ConfirmDialog from "./ConfirmDialog";
import "./DogCard.css";
import "../pages/FindMatchPage.css";
import useDogs from "../hooks/useDogs";
import LoadingState from "./LoadingState";
import ErrorMessage from "./ErrorMessage";

// Component now relies on central useDogs hook for data, caching, and invalidation.

export default function MyDogs({ dogs: overrideDogs = [], onAddDog, userId }) {
  const { dogs, loading, error, refetch, setDogs } = useDogs({ userId });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    dogId: null,
    dogName: "",
  });

  // If parent passes explicit dogs list, prefer it (e.g., for testing scenarios)
  const displayDogs = useMemo(
    () =>
      overrideDogs.length
        ? overrideDogs
        : dogs.map((d) => ({
            ...d,
            age: d.age_years != null ? `${d.age_years} years` : "—",
          })),
    [overrideDogs, dogs]
  );

  const showDeleteConfirmation = useCallback((dogId, dogName) => {
    setConfirmDialog({ isOpen: true, dogId, dogName });
  }, []);
  const closeDeleteConfirmation = useCallback(() => {
    setConfirmDialog({ isOpen: false, dogId: null, dogName: "" });
  }, []);

  const handleDeleteDog = useCallback(async () => {
    const { dogId, dogName } = confirmDialog;
    if (!dogId) return closeDeleteConfirmation();
    try {
      // Remove all documents (storage + DB)
      await removeAllDocumentsForDog(dogId);
      // Delete dog record
      const { error: delErr } = await supabase.from("dogs").delete().eq("id", dogId);
      if (delErr) throw delErr;
      // Optimistically update list
      setDogs((prev) => prev.filter((d) => d.id !== dogId));
      try {
        globalThis.__DB_DOGS_INVALIDATE_TS__ = Date.now();
      } catch (err) {
        // non-fatal: global invalidation not supported
        void err;
      }
      closeDeleteConfirmation();
      setTimeout(() => alert(`${dogName}'s profile deleted.`), 50);
      // Soft refetch to ensure consistency
      setTimeout(() => refetch(), 250);
    } catch (e) {
      console.error("Delete dog failed", e);
      alert(e.message || "Failed to delete dog");
      closeDeleteConfirmation();
    }
  }, [confirmDialog, closeDeleteConfirmation, refetch, setDogs]);

  const handleToggleHidden = useCallback(
    async (dogId, dogName, currentHidden) => {
      try {
        const { error: updErr } = await supabase
          .from("dogs")
          .update({ hidden: !currentHidden })
          .eq("id", dogId);
        if (updErr) throw updErr;
        setDogs((prev) => prev.map((d) => (d.id === dogId ? { ...d, hidden: !currentHidden } : d)));
        setTimeout(() => alert(`${dogName}'s profile ${!currentHidden ? "hidden" : "shown"}.`), 30);
      } catch (e) {
        console.error("Toggle hidden failed", e);
        alert(e.message || "Failed to toggle visibility");
      }
    },
    [setDogs]
  );

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
          <LoadingState message="Loading your dogs..." minHeight={140} />
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
              Add your first dog to get started with breeding matches and connect with other dog
              owners.
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
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  🐾 Start building your dog's profile and find the perfect match!
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-6">
                <ErrorMessage message={error} onRetry={refetch} />
              </div>
            )}
          </div>
        ) : (
          <div className="matches-grid">
            {displayDogs.map((dog) => (
              <div key={dog.id} className={`match-card ${dog.hidden ? "hidden-dog" : ""}`}>
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
                      <span className="detail-value capitalize">{dog.breed}</span>
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
                            ((dog.sex || dog.gender || "").toString().toLowerCase() === "male"
                              ? "male"
                              : (dog.sex || dog.gender || "").toString().toLowerCase() === "female"
                                ? "female"
                                : "unknown")
                          }
                        >
                          {(() => {
                            const g = (dog.sex || dog.gender || "").toString();
                            const label = g ? g[0].toUpperCase() + g.slice(1).toLowerCase() : "—";
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
                      onClick={() => handleToggleHidden(dog.id, dog.name, dog.hidden)}
                      className={dog.hidden ? "view-profile-btn" : "contact-btn"}
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
        message={`Are you sure you want to delete ${confirmDialog.dogName}'s profile?\n\nThis action cannot be undone and will permanently remove all information, photos, and documents for this dog.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
}
