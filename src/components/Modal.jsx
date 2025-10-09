import React, { useEffect, useState } from "react";

export default function Modal({
  open,
  onClose,
  children,
  widthClass = "max-w-3xl",
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) {
      setIsVisible(true);
      // Small delay to trigger the animation
      setTimeout(() => setIsAnimating(true), 10);
      window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    } else if (isVisible) {
      // Start closing animation
      setIsAnimating(false);
      // Hide after animation completes
      setTimeout(() => setIsVisible(false), 300);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-300 ease-in-out ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`w-full ${widthClass} bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden transform transition-all duration-300 ease-in-out ${
            isAnimating
              ? "scale-100 opacity-100 translate-y-0"
              : "scale-95 opacity-0 translate-y-4"
          }`}
          role="dialog"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
