import React, { useEffect, useState } from "react";

export default function ConfirmDialog({
  isOpen,
  open,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "bg-red-600 hover:bg-red-700 text-white",
  extraContent,
}) {
  // Handle escape key to close modal
  const isDialogOpen = typeof open !== "undefined" ? open : isOpen;
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isDialogOpen) {
      setShouldRender(true);
      // Small delay to allow render before animating in
      requestAnimationFrame(() => setIsVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = "unset";
      }, 200); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isDialogOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isDialogOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDialogOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        className={`relative w-full max-w-[480px] transform overflow-hidden rounded-[32px] bg-white p-8 text-left align-middle shadow-2xl transition-all duration-200 ease-out ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Header Box */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-orange-100 bg-[#FFF9F5] p-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold leading-6 text-slate-900" id="modal-title">
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="mb-8 px-1">
          {message ? (
            <p className="text-[15px] text-slate-600 whitespace-pre-line leading-relaxed">
              {message}
            </p>
          ) : null}
          {extraContent}
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-4">
          <button
            type="button"
            className="inline-flex w-full justify-center rounded-2xl bg-[#FFF5EB] px-8 py-4 text-sm font-bold text-[#7C2D12] hover:bg-[#FED7AA] sm:w-auto transition-colors"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`inline-flex w-full justify-center rounded-2xl px-8 py-4 text-sm font-bold shadow-sm sm:w-auto transition-colors uppercase tracking-wide ${
              confirmButtonClass.includes("bg-red")
                ? "bg-[#FFF5EB] text-[#7C2D12] hover:bg-[#FED7AA]" // Override red to match the design in image (both buttons look similar)
                : "bg-[#FFF5EB] text-[#7C2D12] hover:bg-[#FED7AA]"
            }`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
