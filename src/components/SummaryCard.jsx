import React from "react";

const ICONS = {
  Pending: (
    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  Accepted: (
    <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M5 13l4 4L19 7" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  Declined: (
    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  Awaiting: (
    <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  Success: (
    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M5 13l4 4L19 7" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  Failed: (
    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
};

export default function SummaryCard({ label, value, positive, negative }) {
  let color = "bg-slate-100 text-slate-700";
  if (label === "Success" || positive) color = "bg-emerald-100 text-emerald-700";
  if (label === "Failed" || negative) color = "bg-rose-100 text-rose-700";
  if (label === "Accepted") color = "bg-sky-100 text-sky-700";
  if (label === "Declined") color = "bg-rose-100 text-rose-700";
  if (label === "Pending") color = "bg-amber-100 text-amber-800";
  if (label === "Awaiting") color = "bg-violet-100 text-violet-800";
  const icon = ICONS[label] || null;
  return (
    <div className={`rounded-xl p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
