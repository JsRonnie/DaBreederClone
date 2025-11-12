import React, { useEffect } from "react";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "bg-red-600 hover:bg-red-700 text-white",
}) {
  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Backdrop: subtle darken, no heavy blur */}
      <div className="absolute inset-0 bg-black/10" onClick={onClose} aria-hidden="true" />

      {/* Centered modal */}
      <div className="relative z-[91] flex min-h-full items-center justify-center p-4">
        {/* Modal panel - minimalist */}
        <div className="relative w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
          {/* Close button */}
          <button
            type="button"
            aria-label="Close dialog"
            title="Close"
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            onClick={onClose}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Content */}
          <h3 className="text-base font-semibold text-slate-900 pr-6">{title}</h3>
          {message ? (
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{message}</p>
          ) : null}

          {/* Actions */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${confirmButtonClass}`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
