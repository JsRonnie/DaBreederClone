import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import { removeAllDocumentsForDog } from "../lib/dogDocuments";
import ConfirmDialog from "./ConfirmDialog";
import "./DogCard.css";
import useDogs from "../hooks/useDogs";
import LoadingState from "./LoadingState";
import ErrorMessage from "./ErrorMessage";
import { notifyDogsInvalidate } from "../lib/dogEvents";

// Component now relies on central useDogs hook for data, caching, and invalidation.

export default function MyDogs({ dogs: overrideDogs = [], onAddDog, userId }) {
  const { dogs, loading, error, ready, refetch, setDogs, toggleDogVisibility } = useDogs({
    userId,
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    dogId: null,
    dogName: "",
  });
  const [togglingVisibility, setTogglingVisibility] = useState({});
  const [deletingDogId, setDeletingDogId] = useState(null);
  const location = useLocation();
  const [initialDecisionComplete, setInitialDecisionComplete] = useState(
    () => overrideDogs.length > 0
  );

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

    // Set deleting state for animation
    setDeletingDogId(dogId);
    closeDeleteConfirmation();

    // Wait for animation to complete
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      // Remove all documents (storage + DB)
      await removeAllDocumentsForDog(dogId);
      // Delete dog record
      const { error: delErr } = await supabase.from("dogs").delete().eq("id", dogId);
      if (delErr) throw delErr;
      // Optimistically update list
      setDogs((prev) => prev.filter((d) => d.id !== dogId));
      notifyDogsInvalidate("dog-deleted");
      setDeletingDogId(null);
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
      setDeletingDogId(null);
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: e.message || "Failed to delete dog", type: "error" },
        })
      );
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

  useEffect(() => {
    if (location.pathname === "/my-dog") {
      refetch();
    }
  }, [location.pathname, refetch]);

  useEffect(() => {
    if (overrideDogs.length && !initialDecisionComplete) {
      setInitialDecisionComplete(true);
    }
  }, [overrideDogs.length, initialDecisionComplete]);

  useEffect(() => {
    if (initialDecisionComplete) return;
    if (!ready) return;
    if (loading) return;
    setInitialDecisionComplete(true);
  }, [initialDecisionComplete, ready, loading]);

  const hasDogs = displayDogs.length > 0;
  const shouldShowLoadingState = loading || !initialDecisionComplete;
  const showEmptyState = !shouldShowLoadingState && initialDecisionComplete && !hasDogs && !error;

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
        {shouldShowLoadingState ? (
          <LoadingState
            message={loading ? "Loading your dogs..." : "Preparing your dogs..."}
            minHeight={140}
          />
        ) : error ? (
          <div className="empty-state-modern">
            <div className="empty-state-icon">
              <svg
                className="w-8 h-8 text-rose-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M4.93 19h14.14c1.2 0 1.96-1.3 1.35-2.35L13.35 4.65c-.6-1.05-2.1-1.05-2.7 0L3.58 16.65C2.97 17.7 3.73 19 4.93 19z"
                />
              </svg>
            </div>
            <h3 className="empty-state-title">We can't show your dogs</h3>
            <p className="empty-state-description">
              {error.message || "Something went wrong while contacting the server."}
            </p>
            <div className="mt-4">
              <button onClick={refetch} className="view-profile-btn">
                Retry
              </button>
            </div>
          </div>
        ) : showEmptyState ? (
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
            <p className="text-sm text-gray-500 mt-2">
              If you already have dogs or see an error, please refer to support so we can solve the
              issue.
            </p>

            {userId && (
              <p className="text-xs text-slate-500 mb-4">
                Filtering by your account (ID: ...{String(userId).slice(-6)})
              </p>
            )}

            <div className="space-y-4">
              <button
                onClick={onAddDog}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-300 focus:ring-opacity-50 overflow-hidden"
              >
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>

                <svg
                  className="w-6 h-6 mr-3 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span className="relative z-10">Add Your First Dog</span>

                {/* Paw print decoration */}
                <svg
                  className="absolute -bottom-4 -right-2 w-12 h-12 text-white opacity-10 transform rotate-12 group-hover:rotate-0 transition-transform duration-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.22-7.52-3.22 3.22 7.52 3.22-7.52-3.22-7.52-3.22 7.52zM7 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm10 0c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-500 mt-2">
                  Start building your dog's profile and find the perfect match!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="matches-grid">
            {displayDogs.map((dog) => {
              // Removed unused variables as reported by lint
              // const normalizedGender = (dog.sex || dog.gender || "").toString().toLowerCase();
              // const maleSuccessRate =
              //   typeof dog.male_success_rate === "number"
              //     ? dog.male_success_rate
              //     : Number.parseFloat(dog.male_success_rate || 0);
              // const femaleMateCount = dog.female_successful_matings ?? 0;
              // const requestsCount = dog.match_requests_count ?? 0;
              // const completedCount = dog.match_completed_count ?? 0;
              // const successCount = dog.match_success_count ?? 0;

              return (
                <div
                  key={dog.id}
                  className={`match-card ${dog.is_visible === false ? "hidden-dog" : ""} ${deletingDogId === dog.id ? "deleting" : ""}`}
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
                      {/* Removed Requests, Completed, and Successful matings stats as requested */}
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
                            ? "Hide"
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
