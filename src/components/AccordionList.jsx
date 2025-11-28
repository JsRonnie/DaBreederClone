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
    <div className="report-replies-list">
      {replies.length === 0 ? (
        <div className="empty-state">No replies yet.</div>
      ) : (
        pagedReplies.map((reply, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={reply.id} className="reply-item">
              <button
                className="reply-header-btn"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
              >
                <div className="reply-header-content">
                  <Badge
                    variant={
                      reply.action_type === "resolved"
                        ? "default"
                        : reply.action_type === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                    className="reply-badge"
                  >
                    {reply.action_type}
                  </Badge>
                  <span className="reply-reason">{reply.reports?.reason || "Report"}</span>
                  <span className="reply-date">
                    {format(new Date(reply.created_at), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
                <span className="toggle-text">{isOpen ? "Hide" : "Show"}</span>
              </button>
              {isOpen && (
                <div className="reply-details">
                  <div className="reply-details-grid">
                    <div>
                      <div className="detail-row">
                        <span className="detail-label">Type:</span>{" "}
                        {reply.reports?.report_type?.replace("_", " ")}
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">ID:</span> {reply.report_id}
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Action:</span>{" "}
                        {reply.action_type.charAt(0).toUpperCase() + reply.action_type.slice(1)}
                      </div>
                    </div>
                    <div>
                      <div className="detail-row">
                        <span className="detail-label">Reply:</span>
                      </div>
                      <div className="reply-text">{reply.reply_text}</div>
                    </div>
                  </div>
                  <div className="reply-status">
                    {reply.action_type === "resolved" && (
                      <span className="status-resolved">
                        Resolved. Check your account or related content for updates.
                      </span>
                    )}
                    {reply.action_type === "rejected" && (
                      <span className="status-rejected">
                        Rejected. If you need further assistance, contact support.
                      </span>
                    )}
                    {reply.action_type === "review" && (
                      <span className="status-review">
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
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="pagination-btn"
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
