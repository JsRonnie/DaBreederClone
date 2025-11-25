import React from "react";
import "./SummaryCard.css"; // warm dog-lover theme

const ICONS = {
  Pending: (
    <svg className="summary-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  Accepted: (
    <svg className="summary-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M5 13l4 4L19 7" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  Declined: (
    <svg className="summary-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  Awaiting: (
    <svg className="summary-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  Success: (
    <svg className="summary-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M5 13l4 4L19 7" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  Failed: (
    <svg className="summary-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
};

export default function SummaryCard({ label, value, positive, negative }) {
  // Determine card type
  let cardType = "pending";
  if (label === "Success" || positive) cardType = "success";
  if (label === "Failed" || negative) cardType = "failed";
  if (label === "Accepted") cardType = "accepted";
  if (label === "Declined") cardType = "declined";
  if (label === "Pending") cardType = "pending";
  if (label === "Awaiting") cardType = "awaiting";

  const icon = ICONS[label] || null;

  return (
    <div className={`summary-card summary-card-${cardType}`}>
      <div className="summary-card-header">
        {icon}
        <span className="summary-card-label">{label}</span>
      </div>
      <div className="summary-card-value">{value}</div>
    </div>
  );
}
