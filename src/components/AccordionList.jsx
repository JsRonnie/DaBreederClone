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
    <div className="space-y-4">
      {replies.length === 0 ? (
        <div className="text-center text-slate-500 py-6">No replies yet.</div>
      ) : (
        pagedReplies.map((reply, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={reply.id} className="border border-slate-200 rounded-xl bg-white shadow-sm p-4 transition-all">
              <button
                className="w-full text-left flex items-center justify-between px-1 py-2 focus:outline-none hover:bg-slate-50 rounded-lg mb-1"
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
                    className="capitalize px-2 py-1 text-xs font-semibold"
                  >
                    {reply.action_type}
                  </Badge>
                  <span className="font-bold text-base text-slate-900">{reply.reports?.reason || "Report"}</span>
                  <span className="text-slate-500 text-xs ml-2">{format(new Date(reply.created_at), "MMM d, yyyy HH:mm")}</span>
                </div>
                <span className="text-xs text-blue-500 font-semibold">
                  {isOpen ? "Hide" : "Show"}
                </span>
              </button>
              {isOpen && (
                <div className="pt-2 border-t border-slate-100 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                    <div>
                      <div className="text-slate-700 text-sm mb-2"><span className="font-semibold">Type:</span> {reply.reports?.report_type?.replace("_", " ")}</div>
                      <div className="text-slate-700 text-sm mb-2"><span className="font-semibold">ID:</span> {reply.report_id}</div>
                      <div className="text-slate-700 text-sm mb-2"><span className="font-semibold">Action:</span> {reply.action_type.charAt(0).toUpperCase() + reply.action_type.slice(1)}</div>
                    </div>
                    <div>
                      <div className="text-slate-700 text-sm mb-2"><span className="font-semibold">Reply:</span></div>
                      <div className="text-slate-900 text-sm whitespace-pre-line mb-2">{reply.reply_text}</div>
                    </div>
                  </div>
                  <div className="mt-1">
                    {reply.action_type === "resolved" && (
                      <span className="text-green-600 font-semibold text-xs">
                        Resolved. Check your account or related content for updates.
                      </span>
                    )}
                    {reply.action_type === "rejected" && (
                      <span className="text-red-600 font-semibold text-xs">
                        Rejected. If you need further assistance, contact support.
                      </span>
                    )}
                    {reply.action_type === "review" && (
                      <span className="text-blue-600 font-semibold text-xs">
                        Under review. You will be notified when a decision is made.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="px-2 py-1 rounded bg-slate-100 text-slate-600 disabled:opacity-50 text-xs"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-2 py-1 rounded bg-slate-100 text-slate-600 disabled:opacity-50 text-xs"
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
