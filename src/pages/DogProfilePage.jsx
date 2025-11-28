import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import useDogProfile from "../hooks/useDogProfile";
import useDogMatches from "../hooks/useDogMatches";
// ...existing code...
import ReportModal from "../components/ReportModal";
import { useAuth } from "../hooks/useAuth";

import "./DogProfilePage.css"; // warm dog-lover theme
import LoadingState from "../components/LoadingState";

export default function DogProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { dog, photoUrl, loading, error } = useDogProfile(id);
  const { historyMatches, loading: matchesLoading, error: matchesError } = useDogMatches();
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    document.title = dog?.name ? `${dog.name} 🐾 | DaBreeder` : "Dog Profile 🐾 | DaBreeder";
  }, [dog]);

  const dogHistoryMatches = useMemo(
    () =>
      historyMatches?.filter(
        (m) => m.requester_dog_id === dog?.id || m.requested_dog_id === dog?.id
      ) || [],
    [historyMatches, dog?.id]
  );

  const breedStats = useMemo(() => {
    if (!dog?.id || !dogHistoryMatches.length) return [];
    const statsMap = {};
    dogHistoryMatches.forEach((match) => {
      const status = String(match.status || "");
      if (!status.startsWith("completed_")) return;
      const isRequester = String(match.requester_dog_id) === String(dog.id);
      const partnerDog = isRequester ? match.requested_dog : match.requester_dog;
      const partnerBreedRaw = (partnerDog?.breed || "Unknown").trim();
      const partnerBreed = partnerBreedRaw.length ? partnerBreedRaw : "Unknown";
      if (!statsMap[partnerBreed]) {
        statsMap[partnerBreed] = { success: 0, total: 0 };
      }
      statsMap[partnerBreed].total += 1;
      if (status === "completed_success") {
        statsMap[partnerBreed].success += 1;
      }
    });
    return Object.entries(statsMap)
      .filter(([, value]) => value.total > 0)
      .map(([breedName, value]) => ({
        breed: breedName,
        success: value.success,
        total: value.total,
        percentage: Math.round((value.success / value.total) * 100),
      }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return a.breed.localeCompare(b.breed);
      });
  }, [dog?.id, dogHistoryMatches]);

  // ...existing code...

  const isOwner = user && dog && user.id === dog.user_id;

  if (loading && !dog) {
    return <LoadingState message="Loading profile..." minHeight={140} />;
  }

  if (error || !dog) {
    return (
      <div className="dog-profile-error">
        <div className="dog-profile-error-card">
          <div className="dog-profile-error-icon">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="dog-profile-error-title">Profile Not Found</h1>
          <p className="dog-profile-error-message">
            The dog profile you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => {
              if (location.state?.fromFindMatch) {
                navigate("/find-match", {
                  state: {
                    selectedDog: location.state.selectedDog,
                    potentialMatches: location.state.potentialMatches,
                  },
                });
              } else {
                navigate("/my-dog");
              }
            }}
            className="dog-profile-error-btn"
          >
            {location.state?.fromFindMatch ? "Back to Find Match" : "Back to Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dog-profile-page">
        <div className="dog-profile-container">
          {/* Header */}
          <div className="dog-profile-header">
            <div className="dog-profile-header-content">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      if (location.state?.fromFindMatch) {
                        navigate("/find-match", {
                          state: {
                            selectedDog: location.state.selectedDog,
                            potentialMatches: location.state.potentialMatches,
                          },
                        });
                      } else {
                        navigate("/my-dog");
                      }
                    }}
                    className="dog-profile-back-btn"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <div className="flex flex-col">
                    <span className="dog-profile-name">{dog.name}</span>
                    <span className="dog-profile-breed">{dog.breed || "Breed not specified"}</span>
                  </div>
                  {/* ...existing code... */}
                </div>
                <div className="flex-1 flex justify-end">
                  {isOwner ? (
                    <Link
                      to={`/dog/${dog.id}/edit`}
                      className="dog-profile-edit-btn flex items-center space-x-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span>Edit Profile</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => setReportOpen(true)}
                      className="dog-profile-report-btn flex items-center space-x-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      <span>Report</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hero Section with Photo */}
          <div className="mb-8">
            <div className="dog-profile-hero flex flex-col lg:flex-row lg:space-x-8">
              {/* Photo */}
              <div className="shrink-0 mb-6 lg:mb-0">
                <div className="dog-profile-photo-container mx-auto lg:mx-0">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={dog.name}
                      className="dog-profile-photo"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full flex items-center justify-center text-gray-400"
                    style={photoUrl ? { display: "none" } : {}}
                  >
                    <div className="text-center">
                      <svg
                        className="w-16 h-16 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm">No photo</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Info and Details */}
              <div className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="dog-profile-section-title">Basic Information</h3>
                    <div className="space-y-3">
                      <div className="dog-profile-info-item">
                        <dt className="dog-profile-info-label">Gender</dt>
                        <dd className="dog-profile-info-value">{dog.gender || "—"}</dd>
                      </div>
                      <div className="dog-profile-info-item">
                        <dt className="dog-profile-info-label">Size</dt>
                        <dd className="dog-profile-info-value">{dog.size || "—"}</dd>
                      </div>
                      <div className="dog-profile-info-item">
                        <dt className="dog-profile-info-label">Color</dt>
                        <dd className="dog-profile-info-value">{dog.color || "—"}</dd>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="dog-profile-section-title">Details</h3>
                    <div className="space-y-3">
                      <div className="dog-profile-info-item">
                        <dt className="dog-profile-info-label">Age</dt>
                        <dd className="dog-profile-info-value">
                          {dog.age_years ? `${dog.age_years} years` : "—"}
                        </dd>
                      </div>
                      <div className="dog-profile-info-item">
                        <dt className="dog-profile-info-label">Weight</dt>
                        <dd className="dog-profile-info-value">
                          {dog.weight_kg ? `${dog.weight_kg} kg` : "—"}
                        </dd>
                      </div>
                      <div className="dog-profile-info-item">
                        <dt className="dog-profile-info-label">Coat Type</dt>
                        <dd className="dog-profile-info-value">{dog.coat_type || "—"}</dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Dog Characteristics */}
            <div className="dog-profile-card">
              <div className="dog-profile-card-header">
                <h2 className="dog-profile-card-title">Dog Characteristics</h2>
              </div>
              <div className="dog-profile-card-body">
                <div className="space-y-3">
                  <div className="dog-profile-characteristic-item">
                    <dt className="dog-profile-characteristic-label">Activity Level</dt>
                    <dd className="dog-profile-characteristic-value">
                      {dog.activity_level || "—"}
                    </dd>
                  </div>
                  <div className="dog-profile-characteristic-item">
                    <dt className="dog-profile-characteristic-label">Sociability</dt>
                    <dd className="dog-profile-characteristic-value">{dog.sociability || "—"}</dd>
                  </div>
                  <div className="dog-profile-characteristic-item">
                    <dt className="dog-profile-characteristic-label">Trainability</dt>
                    <dd className="dog-profile-characteristic-value">{dog.trainability || "—"}</dd>
                  </div>
                </div>
              </div>
            </div>

            {/* Health & Verification */}
            <div className="dog-profile-card">
              <div className="dog-profile-card-header">
                <h2 className="dog-profile-card-title">Health & Verification</h2>
              </div>
              <div className="dog-profile-card-body">
                <div className="space-y-3">
                  <div className="dog-profile-characteristic-item">
                    <dt className="dog-profile-characteristic-label">Vaccinated</dt>
                    <dd className="flex items-center">
                      {dog.vaccinated ? (
                        <div className="dog-profile-health-yes">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm">Yes</span>
                        </div>
                      ) : (
                        <div className="dog-profile-health-no">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm">No</span>
                        </div>
                      )}
                    </dd>
                  </div>
                  <div className="dog-profile-characteristic-item">
                    <dt className="dog-profile-characteristic-label">DNA Tested</dt>
                    <dd className="flex items-center">
                      {dog.dna_tested ? (
                        <div className="dog-profile-health-yes">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm">Yes</span>
                        </div>
                      ) : (
                        <div className="dog-profile-health-no">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm">No</span>
                        </div>
                      )}
                    </dd>
                  </div>
                  <div className="dog-profile-characteristic-item">
                    <dt className="dog-profile-characteristic-label">Pedigree Certified</dt>
                    <dd className="flex items-center">
                      {dog.pedigree_certified ? (
                        <div className="dog-profile-health-yes">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm">Yes</span>
                        </div>
                      ) : (
                        <div className="dog-profile-health-no">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm">No</span>
                        </div>
                      )}
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Breed Success Insights */}
          <div className="dog-profile-card mt-8">
            <div className="dog-profile-card-header">
              <div>
                <h2 className="dog-profile-card-title">Breed Match Success</h2>
                <p className="dog-profile-card-subtitle">Based on completed breedings</p>
              </div>
            </div>
            <div className="dog-profile-card-body">
              {matchesLoading ? (
                <div className="text-gray-500">Loading success data...</div>
              ) : matchesError ? (
                <div className="text-rose-600 text-sm">Unable to load success rates right now.</div>
              ) : breedStats.length === 0 ? (
                <div className="text-gray-500">No completed breedings recorded yet.</div>
              ) : (
                <div className="breed-success-grid">
                  {breedStats.map((stat) => (
                    <div key={stat.breed} className="breed-success-card">
                      <div className="breed-success-heading">
                        <span className="breed-success-breed">{stat.breed}</span>
                        <span className="breed-success-percentage">{stat.percentage}%</span>
                      </div>
                      <div className="breed-success-meta">
                        {stat.success} of {stat.total} successful
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dog History Card - separate, styled, renamed */}
          {/* Dog History Card - styled like other cards, outside main info card */}
          <div className="dog-profile-card mt-8">
            <div className="dog-profile-card-header">
              <h2 className="dog-profile-card-title">Dog History</h2>
            </div>
            <div className="dog-profile-card-body">
              {matchesLoading ? (
                <div className="text-gray-500">Loading dog history...</div>
              ) : matchesError ? (
                <div className="text-rose-600 text-sm">Unable to load dog history right now.</div>
              ) : dogHistoryMatches.length === 0 ? (
                <div className="text-gray-500">No history found for this dog.</div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="dog-profile-stat-card">
                      <div className="dog-profile-stat-label">Requests</div>
                      <div className="dog-profile-stat-value">{dogHistoryMatches.length}</div>
                    </div>
                    <div className="dog-profile-stat-card">
                      <div className="dog-profile-stat-label">Completed</div>
                      <div className="dog-profile-stat-value">
                        {dogHistoryMatches.filter((m) => m.status.includes("completed")).length}
                      </div>
                    </div>
                    <div className="dog-profile-stat-card">
                      <div className="dog-profile-stat-label">Successes</div>
                      <div className="dog-profile-stat-value">
                        {dogHistoryMatches.filter((m) => m.status === "completed_success").length}
                      </div>
                    </div>
                    <div className="dog-profile-stat-card">
                      <div className="dog-profile-stat-label">Success Rate</div>
                      <div className="dog-profile-stat-value">
                        {dogHistoryMatches.filter((m) => m.status.includes("completed")).length > 0
                          ? (
                              (dogHistoryMatches.filter((m) => m.status === "completed_success")
                                .length /
                                dogHistoryMatches.filter((m) => m.status.includes("completed"))
                                  .length) *
                              100
                            ).toFixed(0)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  {/* History Table */}
                  <div className="overflow-x-auto">
                    <table className="dog-profile-history-table">
                      <thead className="dog-profile-history-header">
                        <tr>
                          <th>Date</th>
                          <th>Partner</th>
                          <th>Status</th>
                          <th>Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dogHistoryMatches.map((match) => {
                          const isRequester = match.requester_dog_id === dog.id;
                          const partnerDog = isRequester
                            ? match.requested_dog
                            : match.requester_dog;
                          const date =
                            match.completed_at ||
                            match.declined_at ||
                            match.cancelled_at ||
                            match.requested_at;
                          const outcome =
                            match.outcome?.outcome ||
                            (match.status === "completed_success"
                              ? "Success"
                              : match.status === "completed_failed"
                                ? "Failed"
                                : match.status.charAt(0).toUpperCase() + match.status.slice(1));
                          return (
                            <tr key={match.id} className="dog-profile-history-row">
                              <td>{date ? new Date(date).toLocaleDateString() : "—"}</td>
                              <td>
                                {partnerDog?.id ? (
                                  <Link
                                    to={`/dog/${partnerDog.id}`}
                                    className="dog-profile-history-link"
                                  >
                                    {partnerDog.name}
                                  </Link>
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </td>
                              <td>
                                {match.status
                                  .replace("completed_", "Completed: ")
                                  .replace("_", " ")}
                              </td>
                              <td>{outcome}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Report Modal */}
        <ReportModal
          isOpen={reportOpen}
          reportType="dog_profile"
          targetData={{
            id: dog.id,
            name: dog.name,
            breed: dog.breed,
            ownerId: dog.user_id,
          }}
          onClose={() => setReportOpen(false)}
          onReportSuccess={() => {
            // Optional: Show success message or refresh
            setReportOpen(false);
          }}
        />
      </div>
    </>
  );
}
