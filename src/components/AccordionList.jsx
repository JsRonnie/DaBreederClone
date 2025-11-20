import React, { useState } from "react";
import { Badge } from "./ui/badge";
import { format } from "date-fns";

export default function AccordionList({ replies }) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(replies.length / pageSize);
  const pagedReplies = replies.slice((page - 1) * pageSize, page * pageSize);
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div>
      <div className="space-y-3">
        {pagedReplies.map((reply, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={reply.id} className="border border-slate-200 rounded-xl bg-white shadow-sm">
              <button
                className={`w-full text-left px-5 py-4 flex items-center justify-between focus:outline-none hover:bg-slate-50 rounded-xl transition`}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      reply.action_type === "resolved"
                        ? "default"
                        : reply.action_type === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                    className="capitalize px-3 py-1 text-xs font-semibold"
                  >
                    {reply.action_type}
                  </Badge>
                  <span className="font-medium text-base text-slate-900">
                    {reply.reports?.reason || "Report"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {format(new Date(reply.created_at), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
                <span className="text-xs text-blue-500 font-semibold">
                  {isOpen ? "Hide details" : "View details"}
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-4 pt-2 border-t border-slate-100 animate-fade-in">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5">
                      Type: {reply.reports?.report_type?.replace("_", " ")}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5">
                      Report ID: {reply.report_id?.slice(0, 8)}…
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5">
                      Action:{" "}
                      {reply.action_type.charAt(0).toUpperCase() + reply.action_type.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 mb-2 whitespace-pre-line">
                    <span className="font-semibold">Admin Reply:</span> {reply.reply_text}
                  </div>
                  <div className="flex flex-col gap-1 mt-2 text-xs">
                    {reply.action_type === "resolved" && (
                      <span className="text-green-600 font-semibold">
                        This report has been resolved. Please check your account or related content
                        for updates.
                      </span>
                    )}
                    {reply.action_type === "rejected" && (
                      <span className="text-red-600 font-semibold">
                        This report was rejected. If you need further assistance, contact support.
                      </span>
                    )}
                    {reply.action_type === "review" && (
                      <span className="text-blue-600 font-semibold">
                        Your report is under review. You will be notified when a decision is made.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            className="px-3 py-1 rounded bg-slate-100 text-slate-600 disabled:opacity-50"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-slate-100 text-slate-600 disabled:opacity-50"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
