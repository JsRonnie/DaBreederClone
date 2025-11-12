import React from "react";

/**
 * Reusable loading state block.
 * Props:
 *  - message: string shown under spinner (default: "Loading...")
 *  - minHeight: reserve vertical space to reduce layout shift (default 120)
 *  - spinnerSize: tailwind size classes (w-10 h-10 by default)
 */
export default function LoadingState({
  message = "Loading...",
  minHeight = 120,
  spinnerSize = "w-10 h-10",
}) {
  return (
    <div className="flex flex-col items-center justify-center text-gray-600" style={{ minHeight }}>
      <div
        className={`animate-spin rounded-full border-4 border-gray-300 border-t-primary ${spinnerSize}`}
        style={{ borderTopColor: "#2563eb" }}
      />
      <p className="mt-3 font-medium">{message}</p>
    </div>
  );
}
