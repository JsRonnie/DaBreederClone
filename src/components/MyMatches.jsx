import "./MyMatches.css"; // warm dog-lover theme
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useDogMatches from "../hooks/useDogMatches";
import LoadingState from "./LoadingState";
import ErrorMessage from "./ErrorMessage";
import MatchOutcomeModal from "./MatchOutcomeModal";
import SummaryCard from "./SummaryCard";

const STATUS_BADGES = {
  pending: { label: "Pending response", color: "bg-amber-100 text-amber-800" },
  accepted: { label: "Accepted", color: "bg-sky-100 text-sky-800" },
  declined: { label: "Declined", color: "bg-rose-100 text-rose-800" },
  cancelled: { label: "Cancelled", color: "bg-slate-200 text-slate-700" },
  awaiting_confirmation: { label: "Awaiting confirmation", color: "bg-violet-100 text-violet-800" },
  completed_success: { label: "Successful", color: "bg-emerald-100 text-emerald-800" },
  completed_failed: { label: "Unsuccessful", color: "bg-rose-100 text-rose-700" },
};

const BREED_BUCKET_LABELS = {
  same: "Same-breed",
  cross: "Cross-breed",
};

const normalizeBreed = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");
const normalizeGender = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

function getBreedBucket(primaryBreed, partnerBreed) {
  const a = normalizeBreed(primaryBreed);
  const b = normalizeBreed(partnerBreed);
  if (!a || !b) return null;
  return a === b ? "same" : "cross";
}

const GENDER_FILTERS = [
  { id: "all", label: "All" },
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
];

function getProgressMessage(match) {
  const status = match.userStatus || match.status;
  if (status === "pending") {
    return match.requiresResponse ? "Waiting for your decision." : "Awaiting partner's response.";
  }
  if (status === "accepted") {
    return match.iAmRequester
      ? "Request accepted. Coordinate the meetup and wait for the outcome."
      : "You accepted this request. Record the outcome once breeding is finished.";
  }
  if (status === "awaiting_confirmation") {
    return match.awaitingMyOutcome
      ? "Please confirm whether the breeding was successful."
      : "Waiting for your partner to report the outcome.";
  }
  if (status === "completed_success") {
    return "Breeding marked as successful.";
  }
  if (status === "completed_failed") {
    return "Breeding marked as unsuccessful.";
  }
  if (status === "declined") {
    return "Request was declined.";
  }
  if (status === "cancelled") {
    return "Request was cancelled.";
  }
  return "Status updated.";
}

function MatchCard({ match, onAccept, onDecline, onCancel, onRecordOutcome, busy, successRates }) {
  const statusKey = match.userStatus || match.status;
  const badge = STATUS_BADGES[statusKey] || {
    label: statusKey,
    color: "bg-slate-100 text-slate-700",
  };
  // Allow both male and female dog owners to accept if they are the receiving owner
  const showAcceptDecline = match.status === "pending" && match.isReceivingOwner;
  const showCancel = match.canCancel;
  const showRecordOutcome = match.awaitingMyOutcome;
  const requestedDate = match.requested_at ? new Date(match.requested_at) : null;
  const progressMessage = getProgressMessage(match);
  const dogId = match.myDog?.id ? String(match.myDog.id) : null;
  const bucketKey = getBreedBucket(match.myDog?.breed, match.partnerDog?.breed);
  let successInfo = null;
  if (dogId && bucketKey && successRates) {
    const stats = successRates[dogId]?.[bucketKey];
    if (stats) {
      if (stats.total > 0) {
        const percent = Math.round((stats.success / stats.total) * 100);
        successInfo = `${BREED_BUCKET_LABELS[bucketKey]} success: ${percent}% (${stats.success}/${stats.total})`;
      } else {
        successInfo = `${BREED_BUCKET_LABELS[bucketKey]} success: —`;
      }
    }
  }

  // Helper to get badge class
  const getBadgeClass = (status) => {
    const statusMap = {
      pending: "status-badge-pending",
      accepted: "status-badge-accepted",
      declined: "status-badge-declined",
      cancelled: "status-badge-cancelled",
      awaiting_confirmation: "status-badge-awaiting",
      completed_success: "status-badge-success",
      completed_failed: "status-badge-failed",
    };
    return statusMap[status] || "status-badge-cancelled";
  };

  function DogInfoCard({ dog, title, isPartner, partnerId, extraInfo }) {
    if (!dog)
      return (
        <div className="dog-info-card">
          <div className="text-xs text-slate-400">No info</div>
        </div>
      );
    const cardContent = (
      <div className="dog-info-card">
        {dog.image_url && <img src={dog.image_url} alt={dog.name} className="dog-avatar" />}
        <div className="dog-info-meta">
          <div className="dog-info-label">{title}</div>
          <div className="dog-info-name">{dog.name}</div>
          <div className="dog-info-details">
            {dog.breed || "Unknown"} • {dog.gender || "Unknown"}
          </div>
          {extraInfo && <div className="dog-extra-info">{extraInfo}</div>}
        </div>
      </div>
    );
    if (isPartner && partnerId) {
      const label = dog.name ? `View ${dog.name}'s profile` : "View partner dog profile";
      return (
        <Link to={`/dog/${partnerId}`} className="dog-info-link" aria-label={label}>
          {cardContent}
        </Link>
      );
    }
    return cardContent;
  }

  return (
    <div className="match-card">
      <div className="match-card-header">
        <div>
          <h3 className="match-card-title">
            {match.myDog?.name} <span className="mx-1 text-slate-400">↔</span>{" "}
            {match.partnerDog?.name || "Owner pending"}
          </h3>
          <div className="match-card-date">
            {match.direction === "sent" ? "Sent" : "Received"} ·{" "}
            {requestedDate ? requestedDate.toLocaleDateString() : "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-badge ${getBadgeClass(statusKey)}`}>{badge.label}</span>
          <button
            type="button"
            className="info-button"
            title={progressMessage}
            aria-label="Breeding progress info"
          >
            i
          </button>
        </div>
      </div>
      <div className="match-card-dogs grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <DogInfoCard dog={match.myDog} title="Your dog" extraInfo={successInfo} />
        <DogInfoCard
          dog={match.partnerDog}
          title="Partner"
          isPartner={true}
          partnerId={match.partnerDog?.id}
        />
      </div>
      {match.outcome && (
        <div className="outcome-display">
          Outcome: <span className="font-medium">{match.outcome.outcome.replace("_", " ")}</span>{" "}
          {match.outcome.notes && `· ${match.outcome.notes}`}
        </div>
      )}
      <div className="match-actions">
        {showAcceptDecline && (
          <>
            <button className="btn-accept" onClick={() => onAccept(match)} disabled={busy}>
              Accept
            </button>
            <button className="btn-decline" onClick={() => onDecline(match)} disabled={busy}>
              Decline
            </button>
          </>
        )}
        {showCancel && (
          <button className="btn-cancel" onClick={() => onCancel(match)} disabled={busy}>
            Cancel
          </button>
        )}
        {showRecordOutcome && (
          <button
            className="btn-record-outcome"
            onClick={() => onRecordOutcome(match)}
            disabled={busy}
          >
            Record outcome
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyMatches({ userId }) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const {
    matches,
    pendingMatches,
    awaitingConfirmationMatches,
    summary,
    loading,
    error,
    refetch,
    acceptMatch,
    updateStatus,
    submitOutcome,
  } = useDogMatches({ userId });
  const [tab, setTab] = useState("pending");
  const [genderFilter, setGenderFilter] = useState("all");
  const [busyMap, setBusyMap] = useState({});
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [outcomeMatch, setOutcomeMatch] = useState(null);

  const successRates = useMemo(() => {
    const stats = {};
    matches.forEach((match) => {
      const dogId = match.myDog?.id ? String(match.myDog.id) : null;
      if (!dogId || !match.partnerDog) return;
      const bucket = getBreedBucket(match.myDog?.breed, match.partnerDog?.breed);
      if (!bucket) return;
      if (!stats[dogId]) {
        stats[dogId] = {
          same: { success: 0, total: 0 },
          cross: { success: 0, total: 0 },
        };
      }
      if (match.status === "completed_success" || match.status === "completed_failed") {
        stats[dogId][bucket].total += 1;
        if (match.status === "completed_success") {
          stats[dogId][bucket].success += 1;
        }
      }
    });
    return stats;
  }, [matches]);

  const tabOptions = useMemo(
    () => [
      { id: "pending", label: "Pending" },
      { id: "declined", label: "Declined" },
      { id: "awaiting", label: "Awaiting" },
      { id: "success", label: "Success" },
      { id: "failed", label: "Failed" },
    ],
    []
  );

  const visibleData = useMemo(() => {
    // Move helper functions inside useMemo
    const normalizedUserId = userId ? String(userId) : null;
    const isOwner = (dog) => {
      if (!dog || !normalizedUserId) return false;
      const owner = dog.owner_id ?? dog.user_id;
      if (!owner) return false;
      return String(owner) === normalizedUserId;
    };
    function isReceivingOwner(match) {
      if (match.direction === "received") {
        return isOwner(match.myDog);
      } else {
        return isOwner(match.partnerDog);
      }
    }
    function isFemaleDogOwner(match) {
      if (match.partnerDog && match.partnerDog.gender === "female" && isOwner(match.partnerDog)) {
        return true;
      }
      if (match.myDog && match.myDog.gender === "female" && isOwner(match.myDog)) {
        return true;
      }
      return false;
    }
    let list = [];
    switch (tab) {
      case "pending":
        list = pendingMatches;
        break;
      // Removed accepted tab
      case "declined":
        list = matches.filter((m) => m.status === "declined" || m.status === "cancelled");
        break;
      case "awaiting":
        list = awaitingConfirmationMatches;
        break;
      case "success":
        list = matches.filter((m) => m.status === "completed_success");
        break;
      case "failed":
        list = matches.filter((m) => m.status === "completed_failed");
        break;
      default:
        list = matches;
    }
    const matchesWithHelpers = list.map((m) => ({
      ...m,
      isReceivingOwner: isReceivingOwner(m),
      isFemaleDogOwner: isFemaleDogOwner(m),
    }));
    const filteredByGender = matchesWithHelpers.filter((match) => {
      if (genderFilter === "all") return true;
      return normalizeGender(match.myDog?.gender) === genderFilter;
    });
    const start = (page - 1) * PAGE_SIZE;
    return {
      items: filteredByGender.slice(start, start + PAGE_SIZE),
      total: filteredByGender.length,
    };
  }, [tab, pendingMatches, awaitingConfirmationMatches, matches, page, userId, genderFilter]);

  const visibleMatches = visibleData.items;
  const totalFiltered = visibleData.total;

  React.useEffect(() => {
    if (totalFiltered === 0) {
      if (page !== 1) setPage(1);
      return;
    }
    if ((page - 1) * PAGE_SIZE >= totalFiltered) {
      setPage(1);
    }
  }, [totalFiltered, page]);

  React.useEffect(() => {
    setPage(1);
  }, [tab, genderFilter]);

  const handleStatusChange = async (match, status) => {
    setBusyMap((prev) => ({ ...prev, [match.id]: true }));
    try {
      await updateStatus(match.id, status);
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: `Match ${status.replace("_", " ")}`, type: "success" },
        })
      );
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: err.message || "Failed to update match", type: "error" },
        })
      );
    } finally {
      setBusyMap((prev) => ({ ...prev, [match.id]: false }));
    }
  };

  const handleAccept = async (match) => {
    setBusyMap((prev) => ({ ...prev, [match.id]: true }));
    try {
      await acceptMatch(match.id);
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Match awaiting confirmation", type: "success" },
        })
      );
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: err.message || "Failed to accept match", type: "error" },
        })
      );
    } finally {
      setBusyMap((prev) => ({ ...prev, [match.id]: false }));
    }
  };

  const handleRecordOutcome = (match) => {
    setOutcomeMatch(match);
    setOutcomeModalOpen(true);
  };

  const closeOutcomeModal = () => {
    setOutcomeModalOpen(false);
    setOutcomeMatch(null);
  };

  return (
    <div className="find-match-container">
      <div className="header-section">
        <h1 className="page-title">My Matches</h1>
        <p className="page-description">Track requests, confirmations, and outcomes</p>
      </div>
      <div className="content-section">
        <div className="mb-8">
          <div className="summary-grid">
            <SummaryCard label="Pending" value={summary.pending} />
            <SummaryCard label="Declined" value={summary.declines} />
            <SummaryCard label="Awaiting" value={summary.awaitingConfirmation} />
            <SummaryCard label="Success" value={summary.successes} positive />
            <SummaryCard label="Failed" value={summary.failures} negative />
          </div>
        </div>
        {loading && matches.length === 0 ? (
          <LoadingState message="Loading your matches..." minHeight={160} />
        ) : error ? (
          <ErrorMessage message={error.message} onRetry={refetch} />
        ) : (
          <>
            <div className="filter-bar">
              <span className="filter-label">Show</span>
              <div className="filter-chip-group">
                {GENDER_FILTERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`filter-chip ${genderFilter === option.id ? "active" : ""}`}
                    onClick={() => setGenderFilter(option.id)}
                    aria-pressed={genderFilter === option.id}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
              {tabOptions.map((option) => (
                <button
                  key={option.id}
                  className={`tab-button ${tab === option.id ? "active" : ""}`}
                  onClick={() => setTab(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {visibleMatches.length === 0 ? (
              <div className="empty-state-matches">
                <svg
                  className="empty-state-icon"
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
                <h3 className="empty-state-title">No matches yet</h3>
                <p className="empty-state-message">
                  Start conversations on Find Match to see them appear here.
                </p>
                <Link to="/find-match" className="btn-find-match">
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Find Match
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-6">
                  {visibleMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onAccept={handleAccept}
                      onDecline={(m) => handleStatusChange(m, "declined")}
                      onCancel={(m) => handleStatusChange(m, "cancelled")}
                      onRecordOutcome={handleRecordOutcome}
                      busy={!!busyMap[match.id]}
                      successRates={successRates}
                    />
                  ))}
                </div>
                <div className="pagination">
                  <button
                    className="pagination-button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <span className="pagination-text">Page {page}</span>
                  <button
                    className="pagination-button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={visibleMatches.length < PAGE_SIZE}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <MatchOutcomeModal
        open={outcomeModalOpen}
        onClose={closeOutcomeModal}
        onSubmit={submitOutcome}
        match={outcomeMatch}
      />
    </div>
  );
}
