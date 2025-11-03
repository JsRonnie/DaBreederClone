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
      timerRef.current = setTimeout(
        () => setToast(null),
        detail.duration || 3500
      );
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
      className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-center p-4"
    >
      <div
        className={`pointer-events-auto ${color} text-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2`}
        role="status"
      >
        <span className="text-sm">{toast.message}</span>
        <button
          aria-label="Dismiss notification"
          className="ml-1 rounded-full/50 bg-white/15 hover:bg-white/25 px-2 py-0.5 text-xs"
          onClick={() => setToast(null)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
