import React from "react";

export default function Toast() {
  const [toast, setToast] = React.useState(null); // { message, type }
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    function onToast(e) {
      const detail = e?.detail || {};
      const message = typeof detail === "string" ? detail : detail.message;
      const type = (typeof detail === "object" && detail.type) || "info";
      if (!message) return;
      setToast({ message, type });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setToast(null), detail.duration || 3500);
    }
    window.addEventListener("toast", onToast);
    return () => {
      window.removeEventListener("toast", onToast);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!toast) return null;

  const color =
    toast.type === "success"
      ? "bg-emerald-600"
      : toast.type === "error"
        ? "bg-rose-600"
        : toast.type === "warning"
          ? "bg-amber-600"
          : "bg-slate-800";

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-0 z-100 flex items-start justify-end p-4"
    >
      <div
        className={`pointer-events-auto ${color} text-white shadow-xl rounded-lg px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-md animate-slide-in`}
        role="status"
        style={{
          animation: "slideInRight 0.3s ease-out",
        }}
      >
        <div className="flex-1">
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
        <button
          aria-label="Dismiss notification"
          className="ml-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors p-1.5 text-xs shrink-0"
          onClick={() => setToast(null)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
