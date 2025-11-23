import "../pages/FindMatchPage.css";
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

function MatchCard({ match, onAccept, onDecline, onCancel, onRecordOutcome, busy }) {
  const statusKey = match.userStatus || match.status;
  const badge = STATUS_BADGES[statusKey] || {
    label: statusKey,
    color: "bg-slate-100 text-slate-700",
  };
  // Allow both male and female dog owners to accept if they are the receiving owner
  const showAcceptDecline =
    match.status === "pending" && match.requiresResponse && match.isReceivingOwner;
  const showCancel = match.canCancel;
  const showRecordOutcome = match.awaitingMyOutcome;
  const requestedDate = match.requested_at ? new Date(match.requested_at) : null;
  const progressMessage = getProgressMessage(match);

  function DogInfoCard({ dog, title, isPartner, partnerId }) {
    if (!dog)
      return <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-400">No info</div>;
    const cardContent = (
      <div className="rounded-lg bg-slate-50 p-2 flex gap-2 items-center">
        {dog.image_url && (
          <img
            src={dog.image_url}
            alt={dog.name}
            className="w-12 h-12 rounded-full object-cover border border-slate-200"
          />
        )}
        <div>
          <div className="text-xs text-slate-400 mb-1">{title}</div>
          <div className="text-sm font-semibold text-slate-800">{dog.name}</div>
          <div className="text-xs text-slate-400">
            {dog.breed || "Unknown"} • {dog.gender || "Unknown"}
          </div>
        </div>
      </div>
    );
    if (isPartner && partnerId) {
      return (
        <Link to={`/dog/${partnerId}`} className="block" style={{ textDecoration: "none" }}>
          {cardContent}
        </Link>
      );
    }
    return cardContent;
  }

  return (
    <div className="p-5 border border-slate-100 rounded-2xl bg-white transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h3 className="text-base font-medium text-slate-900 mb-1">
            {match.myDog?.name} <span className="mx-1 text-slate-400">↔</span>{" "}
            {match.partnerDog?.name || "Owner pending"}
          </h3>
          <div className="text-xs text-slate-400">
            {match.direction === "sent" ? "Sent" : "Received"} ·{" "}
            {requestedDate ? requestedDate.toLocaleDateString() : "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} bg-opacity-60`}
          >
            {badge.label}
          </span>
          <button
            type="button"
            className="w-5 h-5 rounded-full border border-slate-300 text-[10px] font-semibold text-slate-500 flex items-center justify-center hover:bg-slate-100"
            title={progressMessage}
            aria-label="Breeding progress info"
          >
            i
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <DogInfoCard dog={match.myDog} title="Your dog" />
        <DogInfoCard
          dog={match.partnerDog}
          title="Partner"
          isPartner={true}
          partnerId={match.partnerDog?.id}
        />
      </div>
      {/* Removed separate View partner profile link */}
      {match.outcome && (
        <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
          Outcome: <span className="font-medium">{match.outcome.outcome.replace("_", " ")}</span>{" "}
          {match.outcome.notes && `· ${match.outcome.notes}`}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {showAcceptDecline && (
          <>
            <button
              className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium transition hover:bg-emerald-600 disabled:opacity-50"
              onClick={() => onAccept(match)}
              disabled={busy}
            >
              Accept
            </button>
            <button
              className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-medium transition hover:bg-rose-600 disabled:opacity-50"
              onClick={() => onDecline(match)}
              disabled={busy}
            >
              Decline
            </button>
          </>
        )}
        {showCancel && (
          <button
            className="px-3 py-1 rounded-full border border-slate-300 text-xs font-medium transition hover:bg-slate-100 disabled:opacity-50"
            onClick={() => onCancel(match)}
            disabled={busy}
          >
            Cancel
          </button>
        )}
        {showRecordOutcome && (
          <button
            className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-medium transition hover:bg-blue-700 disabled:opacity-50"
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
    acceptedMatches,
    awaitingConfirmationMatches,
    historyMatches,
    summary,
    loading,
    error,
    refetch,
    acceptMatch,
    updateStatus,
    submitOutcome,
  } = useDogMatches({ userId });
  const [tab, setTab] = useState("pending");
  const [busyMap, setBusyMap] = useState({});
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [outcomeMatch, setOutcomeMatch] = useState(null);

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

  const visibleMatches = useMemo(() => {
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
    const start = (page - 1) * PAGE_SIZE;
    return matchesWithHelpers.slice(start, start + PAGE_SIZE);
  }, [tab, pendingMatches, awaitingConfirmationMatches, matches, page, userId]);

  React.useEffect(() => {
    let total = 0;
    switch (tab) {
      case "pending":
        total = pendingMatches.length;
        break;
      case "accepted":
        total = acceptedMatches.length;
        break;
      case "awaiting":
        total = awaitingConfirmationMatches.length;
        break;
      case "history":
        total = historyMatches.length;
        break;
      default:
        total = matches.length;
    }
    if ((page - 1) * PAGE_SIZE >= total) {
      setPage(1);
    }
  }, [
    tab,
    page,
    pendingMatches.length,
    acceptedMatches.length,
    awaitingConfirmationMatches.length,
    historyMatches.length,
    matches.length,
  ]);

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
          <div className="mt-6 grid grid-cols-3 gap-3">
            <SummaryCard label="Pending" value={summary.pending} />
            <SummaryCard label="Declined" value={summary.declines} />
            <SummaryCard label="Awaiting" value={summary.awaitingConfirmation} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
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
            <div className="flex gap-2 mb-6">
              {tabOptions.map((option) => (
                <button
                  key={option.id}
                  className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${tab === option.id ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                  onClick={() => setTab(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {visibleMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-4">
                  <svg
                    className="w-10 h-10 text-gray-400"
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
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No matches yet</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Start conversations on Find Match to see them appear here.
                </p>
                <Link
                  to="/find-match"
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-linear-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50"
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
                    />
                  ))}
                </div>
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    className="px-3 py-1 rounded border text-xs font-medium bg-white hover:bg-slate-100 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-600">Page {page}</span>
                  <button
                    className="px-3 py-1 rounded border text-xs font-medium bg-white hover:bg-slate-100 disabled:opacity-50"
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
