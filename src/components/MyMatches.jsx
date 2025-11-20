import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useDogMatches from "../hooks/useDogMatches";
import LoadingState from "./LoadingState";
import ErrorMessage from "./ErrorMessage";
import MatchOutcomeModal from "./MatchOutcomeModal";

const STATUS_BADGES = {
  pending: { label: "Pending response", color: "bg-amber-100 text-amber-800" },
  accepted: { label: "Accepted", color: "bg-sky-100 text-sky-800" },
  declined: { label: "Declined", color: "bg-rose-100 text-rose-800" },
  cancelled: { label: "Cancelled", color: "bg-slate-200 text-slate-700" },
  awaiting_confirmation: { label: "Awaiting confirmation", color: "bg-violet-100 text-violet-800" },
  completed_success: { label: "Successful", color: "bg-emerald-100 text-emerald-800" },
  completed_failed: { label: "Unsuccessful", color: "bg-rose-100 text-rose-700" },
};

function MatchCard({ match, onAccept, onDecline, onCancel, onOutcome, busy }) {
  const badge = STATUS_BADGES[match.status] || {
    label: match.status,
    color: "bg-slate-100 text-slate-700",
  };
  const showAcceptDecline = match.status === "pending" && match.requiresResponse;
  const showCancel = match.canCancel;
  const showOutcome = match.awaitingMyOutcome;
  const partnerStats = match.partnerDog
    ? [
        `${match.partnerDog.match_requests_count ?? 0} requests`,
        `${match.partnerDog.match_completed_count ?? 0} completed`,
        `${match.partnerDog.match_success_count ?? 0} successes`,
      ]
    : [];
  const requestedDate = match.requested_at ? new Date(match.requested_at) : null;
  const updatedValue =
    match.last_status_changed_at ||
    match.completed_at ||
    match.awaiting_confirmation_at ||
    match.accepted_at ||
    match.requested_at;
  const updatedDate = updatedValue ? new Date(updatedValue) : null;

  return (
    <div className="p-4 border border-slate-200 rounded-xl bg-white/70 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">
            {match.direction === "sent" ? "You sent" : "You received"}
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {match.myDog?.name} ↔ {match.partnerDog?.name || "Owner pending"}
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Requested {requestedDate ? requestedDate.toLocaleDateString() : "—"} · last update{" "}
            {updatedDate ? updatedDate.toLocaleDateString() : "—"}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Your dog</div>
          <div className="text-sm font-medium text-slate-900">{match.myDog?.name}</div>
          <div className="text-xs text-slate-500">
            {match.myDog?.breed || "Unknown breed"} • {match.myDog?.gender || "Unknown"}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
            <span>Requests: {match.myDog?.match_requests_count ?? 0}</span>
            <span>Completed: {match.myDog?.match_completed_count ?? 0}</span>
            <span>Successes: {match.myDog?.match_success_count ?? 0}</span>
            {match.myDog?.gender?.toLowerCase() === "male" && (
              <span>Success rate: {Number(match.myDog?.male_success_rate || 0).toFixed(0)}%</span>
            )}
            {match.myDog?.gender?.toLowerCase() === "female" && (
              <span>Verified matings: {match.myDog?.female_successful_matings ?? 0}</span>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-3">
          <div className="text-xs text-slate-500">Partner dog</div>
          <div className="text-sm font-medium text-slate-900">{match.partnerDog?.name || "—"}</div>
          <div className="text-xs text-slate-500">
            {match.partnerDog?.breed || "Unknown"} • {match.partnerDog?.gender || "Unknown"}
          </div>
          {partnerStats.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
              {partnerStats.map((stat) => (
                <span key={stat}>{stat}</span>
              ))}
            </div>
          )}
          <Link
            to={match.partnerDog ? `/dog/${match.partnerDog.id}` : "/find-match"}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            View profile →
          </Link>
        </div>
      </div>

      {match.outcome && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Outcome recorded: {match.outcome.outcome.replace("_", " ")}. {match.outcome.notes || ""}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {showAcceptDecline && (
          <>
            <button
              className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-50"
              onClick={() => onAccept(match)}
              disabled={busy}
            >
              Accept
            </button>
            <button
              className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm disabled:opacity-50"
              onClick={() => onDecline(match)}
              disabled={busy}
            >
              Decline
            </button>
          </>
        )}
        {showCancel && (
          <button
            className="px-4 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => onCancel(match)}
            disabled={busy}
          >
            Cancel Request
          </button>
        )}
        {showOutcome && (
          <button
            className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm disabled:opacity-50"
            onClick={() => onOutcome(match)}
            disabled={busy}
          >
            Record Outcome
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyMatches({ userId }) {
  const {
    matches,
    pendingMatches,
    awaitingConfirmationMatches,
    historyMatches,
    summary,
    loading,
    error,
    refetch,
    updateStatus,
    submitOutcome,
  } = useDogMatches({ userId });
  const [tab, setTab] = useState("pending");
  const [busyMap, setBusyMap] = useState({});
  const [outcomeMatch, setOutcomeMatch] = useState(null);

  const tabOptions = useMemo(
    () => [
      { id: "pending", label: `Pending (${pendingMatches.length})` },
      { id: "awaiting", label: `Awaiting Confirmation (${awaitingConfirmationMatches.length})` },
      { id: "history", label: `History (${historyMatches.length})` },
      { id: "all", label: `All (${matches.length})` },
    ],
    [
      pendingMatches.length,
      awaitingConfirmationMatches.length,
      historyMatches.length,
      matches.length,
    ]
  );

  const visibleMatches = useMemo(() => {
    switch (tab) {
      case "pending":
        return pendingMatches;
      case "awaiting":
        return awaitingConfirmationMatches;
      case "history":
        return historyMatches;
      default:
        return matches;
    }
  }, [tab, pendingMatches, awaitingConfirmationMatches, historyMatches, matches]);

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

  const handleOutcomeSubmit = async (payload) => {
    await submitOutcome(payload);
  };

  return (
    <div className="find-match-container">
      <div className="header-section">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <MatchesGlyph />
            <div>
              <h1 className="page-title mb-1">My Matches</h1>
              <p className="page-description">
                Track every request, pending confirmation, and success story.
              </p>
            </div>
          </div>
          <Link
            to="/find-match"
            className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-9A2.25 2.25 0 0 0 2.25 5.25v9A2.25 2.25 0 0 0 4.5 16.5H9"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.5 16.5 4.5 4.5m0-4.5-4.5 4.5"
              />
            </svg>
            Find new matches
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <SummaryCard label="Total requests" value={summary.total} />
          <SummaryCard label="Pending" value={summary.pending} />
          <SummaryCard label="Awaiting confirmation" value={summary.awaitingConfirmation} />
          <SummaryCard label="Successful pairings" value={summary.successes} positive />
          <SummaryCard label="Failed attempts" value={summary.failures} negative />
          <SummaryCard label="Declined/Cancelled" value={summary.declines} />
        </div>
      </div>

      <div className="content-section">
        {loading && matches.length === 0 ? (
          <LoadingState message="Loading your matches..." minHeight={160} />
        ) : error ? (
          <ErrorMessage message={error.message} onRetry={refetch} />
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {tabOptions.map((option) => (
                <button
                  key={option.id}
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                    tab === option.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() => setTab(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {visibleMatches.length === 0 ? (
              <div className="empty-state-modern">
                <div className="empty-state-icon">🐶</div>
                <h3 className="empty-state-title">No matches in this category yet</h3>
                <p className="empty-state-description">
                  Start conversations on Find Match to see them appear here.
                </p>
                <Link to="/find-match" className="contact-btn">
                  Browse matches
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {visibleMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    busy={!!busyMap[match.id]}
                    onAccept={() => handleStatusChange(match, "accepted")}
                    onDecline={() => handleStatusChange(match, "declined")}
                    onCancel={() => handleStatusChange(match, "cancelled")}
                    onOutcome={(m) => setOutcomeMatch(m)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <MatchOutcomeModal
        open={!!outcomeMatch}
        match={outcomeMatch}
        onClose={() => setOutcomeMatch(null)}
        onSubmit={handleOutcomeSubmit}
      />
    </div>
  );
}

function MatchesGlyph() {
  return (
    <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white shadow-xl shadow-purple-500/20">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="size-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 5.5C5 5.5 3.5 7.2 3.5 9.2c0 4.8 6.5 8 6.5 8s6.5-3.2 6.5-8c0-2-1.5-3.7-3.5-3.7-1.4 0-2.6.8-3 2-.4-1.2-1.6-2-3-2Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity=".7"
          d="M17 6.5c1.4 0 2.5 1.1 2.5 2.6 0 3.3-4.3 5.5-4.3 5.5"
        />
      </svg>
    </div>
  );
}

function SummaryCard({ label, value, positive, negative }) {
  const color = positive ? "text-emerald-600" : negative ? "text-rose-600" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
