import React from "react";
import "./LoadingState.css"; // warm dog-lover theme

/**
 * Reusable loading state block with warm dog-lover theme.
 * Props:
 *  - message: string shown under spinner (default: "Loading...")
 *  - minHeight: reserve vertical space to reduce layout shift (default 120)
 *  - spinnerSize: "small", "default", or "large"
 */
export default function LoadingState({
  message = "Loading...",
  minHeight = 120,
  spinnerSize = "default",
}) {
  const sizeClass =
    spinnerSize === "small"
      ? "loading-spinner-small"
      : spinnerSize === "large"
        ? "loading-spinner-large"
        : "";

  return (
    <div className="loading-state" style={{ minHeight }}>
      <div className={`loading-spinner ${sizeClass}`} />
      <p className="loading-message">{message}</p>
    </div>
  );
}
