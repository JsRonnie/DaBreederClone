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
  const { dogs, loading, error, refetch, setDogs, toggleDogVisibility } = useDogs({ userId });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    dogId: null,
    dogName: "",
  });
  const [togglingVisibility, setTogglingVisibility] = useState({});

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
      // Show toast notification
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: `${dogName}'s profile deleted successfully`, type: "success" },
        })
      );
      // Soft refetch to ensure consistency
      setTimeout(() => refetch(), 250);
    } catch (e) {
      console.error("Delete dog failed", e);
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: e.message || "Failed to delete dog", type: "error" },
        })
      );
      closeDeleteConfirmation();
    }
  }, [confirmDialog, closeDeleteConfirmation, refetch, setDogs]);

  const handleToggleMatchVisibility = useCallback(
    async (dogId, dogName, currentVisibility) => {
      setTogglingVisibility((prev) => ({ ...prev, [dogId]: true }));
      const newVisibility = currentVisibility === false;
      const result = await toggleDogVisibility(dogId, newVisibility);
      setTogglingVisibility((prev) => ({ ...prev, [dogId]: false }));

      if (result.success) {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: {
              message: `${dogName} is now ${newVisibility ? "visible" : "hidden"} in Find Match`,
              type: "success",
            },
          })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { message: "Failed to update visibility. Please try again.", type: "error" },
          })
        );
      }
    },
    [toggleDogVisibility]
  );

  return (
    <div className="find-match-container">
      {/* Header Section */}
      <div className="header-section">
        <h1 className="page-title">My Dogs</h1>
        <p className="page-description">
          Manage your dog profiles and find perfect breeding matches
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/my-matches"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-white/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4 12 4 4 12-12" />
              </svg>
            </span>
            <span>View match history</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-4"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
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
            {displayDogs.map((dog) => {
              const normalizedGender = (dog.sex || dog.gender || "").toString().toLowerCase();
              const maleSuccessRate =
                typeof dog.male_success_rate === "number"
                  ? dog.male_success_rate
                  : Number.parseFloat(dog.male_success_rate || 0);
              const femaleMateCount = dog.female_successful_matings ?? 0;
              const requestsCount = dog.match_requests_count ?? 0;
              const completedCount = dog.match_completed_count ?? 0;
              const successCount = dog.match_success_count ?? 0;

              return (
                <div
                  key={dog.id}
                  className={`match-card ${dog.is_visible === false ? "hidden-dog" : ""}`}
                >
                  {dog.is_visible === false && (
                    <div className="match-rank">Hidden from Matches</div>
                  )}

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
                                : (dog.sex || dog.gender || "").toString().toLowerCase() ===
                                    "female"
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

                    <div className="match-details" style={{ marginTop: "0.5rem" }}>
                      <div className="detail-item">
                        <span className="detail-label">Requests</span>
                        <span className="detail-value">{requestsCount}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Completed</span>
                        <span className="detail-value">{completedCount}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          {normalizedGender === "male" ? "Success rate" : "Successful matings"}
                        </span>
                        <span className="detail-value">
                          {normalizedGender === "male"
                            ? `${Number.isFinite(maleSuccessRate) ? maleSuccessRate.toFixed(0) : 0}% (${successCount})`
                            : femaleMateCount}
                        </span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <Link to={`/dog/${dog.id}`} className="view-profile-btn">
                        View Profile
                      </Link>

                      <button
                        onClick={() =>
                          handleToggleMatchVisibility(dog.id, dog.name, dog.is_visible ?? true)
                        }
                        disabled={togglingVisibility[dog.id]}
                        className={dog.is_visible !== false ? "contact-btn" : "view-profile-btn"}
                        style={{
                          opacity: togglingVisibility[dog.id] ? 0.6 : 1,
                          cursor: togglingVisibility[dog.id] ? "not-allowed" : "pointer",
                        }}
                      >
                        {togglingVisibility[dog.id]
                          ? "Processing..."
                          : dog.is_visible !== false
                            ? "Hide from Matches"
                            : "Show in Matches"}
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
              );
            })}
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
