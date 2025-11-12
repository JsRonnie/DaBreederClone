import React from "react";

/**
 * Simple reusable error message block.
 * Props:
 *  - message: string or Error
 *  - onRetry?: () => void
 */
export default function ErrorMessage({ message, onRetry }) {
  const text = typeof message === "string" ? message : message?.message || "An error occurred.";
  return (
    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <p className="mb-2 font-medium">{text}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm underline hover:text-red-900">
          Retry
        </button>
      )}
    </div>
  );
}
