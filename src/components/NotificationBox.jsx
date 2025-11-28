import "./NotificationBox.css";
import React, { useEffect, useState } from "react";
import { fetchReportRepliesForUser } from "../lib/reportReplies";
import { useAuth } from "../context/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import supabase from "../lib/supabaseClient";

const ITEMS_PER_PAGE = 5;

export default function NotificationBox() {
  const { user } = useAuth();
  const [replies, setReplies] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState("all"); // "all", "notifications", "replies"

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      fetchReportRepliesForUser(user.id),
      supabase
        .from("notifications")
        .select("id, type, message, created_at, is_read")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ])
      .then(([reportReplies, notifRes]) => {
        setReplies(reportReplies || []);
        setNotifications(notifRes.data || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load notifications");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const markAsRead = async (notificationId) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  if (!user?.id) {
    return (
      <div className="auth-required">
        <h3>Authentication Required</h3>
        <p>Please sign in to view your notifications and report replies.</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Combine and tag data
  const taggedNotifications = notifications.map((n) => ({ ...n, itemType: "notification" }));
  const taggedReplies = replies.map((r) => ({ ...r, itemType: "reply" }));

  // Combine and sort by created_at
  const allItems = [...taggedNotifications, ...taggedReplies].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  // Apply filter
  const filteredItems =
    filter === "all" ? allItems : filter === "notifications" ? taggedNotifications : taggedReplies;

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const getActionBadgeClass = (actionType) => {
    switch (actionType) {
      case "resolved":
        return "status-badge-resolved";
      case "rejected":
        return "status-badge-rejected";
      case "review":
        return "status-badge-review";
      default:
        return "status-badge-review";
    }
  };

  return (
    <div className="notification-container">
      {/* Header Section */}
      <div className="header-section">
        <div className="header-content">
          <h1 className="page-title">Notifications & Report Replies</h1>
          {unreadCount > 0 && <span className="unread-badge">{unreadCount} new</span>}
        </div>
        <p className="page-description">
          View all notifications and admin responses to your reports
        </p>
      </div>

      {/* Main Content */}
      <div className="content-wrapper">
        <Card className="notification-card-full">
          <CardHeader className="card-header-modern">
            <div className="card-title-wrapper">
              <CardTitle className="card-title-modern">All Activity</CardTitle>
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${filter === "all" ? "active" : ""}`}
                  onClick={() => handleFilterChange("all")}
                >
                  All ({allItems.length})
                </button>
                <button
                  className={`filter-tab ${filter === "notifications" ? "active" : ""}`}
                  onClick={() => handleFilterChange("notifications")}
                >
                  Notifications ({notifications.length})
                </button>
                <button
                  className={`filter-tab ${filter === "replies" ? "active" : ""}`}
                  onClick={() => handleFilterChange("replies")}
                >
                  Report Replies ({replies.length})
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="card-content-modern">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <span className="loading-text">Loading…</span>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>{error}</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="empty-state">
                <h3>No items yet</h3>
                <p>
                  {filter === "notifications"
                    ? "No notifications to show."
                    : filter === "replies"
                      ? "No report replies yet."
                      : "You're all caught up!"}
                </p>
              </div>
            ) : (
              <>
                <ul className="notification-list">
                  {paginatedItems.map((item) =>
                    item.itemType === "notification" ? (
                      // Notification Item
                      <li
                        key={`notif-${item.id}`}
                        className={`notification-item ${!item.is_read ? "unread" : "read"}`}
                        onClick={() => !item.is_read && markAsRead(item.id)}
                      >
                        <div className="notification-header">
                          <div className="notification-type">
                            <span className="type-label">
                              {item.type.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </div>
                          {!item.is_read && <span className="new-badge">NEW</span>}
                        </div>

                        <div className="notification-body">
                          {item.message.includes("Reason:") ? (
                            <>
                              <span className="message-text">
                                {item.message.split("Reason:")[0]}
                              </span>
                              <div className="reason-highlight">
                                <strong>Reason:</strong>
                                {item.message.split("Reason:")[1]}
                              </div>
                            </>
                          ) : (
                            <span className="message-text">{item.message}</span>
                          )}
                        </div>

                        <div className="notification-footer">
                          <span className="timestamp">
                            {new Date(item.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </li>
                    ) : (
                      // Reply Item
                      <li key={`reply-${item.id}`} className="notification-item">
                        <div className="notification-header">
                          <div className="notification-type">
                            <span className={`type-label ${getActionBadgeClass(item.action_type)}`}>
                              {item.action_type.toUpperCase()}
                            </span>
                          </div>
                          <span className="type-label-secondary">
                            {item.reports?.reason || "Report"}
                          </span>
                        </div>

                        <div className="notification-body">
                          <div className="reply-info-grid">
                            <div className="reply-info-item">
                              <strong>Type:</strong> {item.reports?.report_type?.replace("_", " ")}
                            </div>
                            <div className="reply-info-item">
                              <strong>Report ID:</strong> {item.report_id}
                            </div>
                          </div>

                          <div className="reply-message">
                            <strong>Admin Reply:</strong>
                            <p>{item.reply_text}</p>
                          </div>

                          {item.action_type === "resolved" && (
                            <div className="status-info status-resolved">
                              Resolved. Check your account or related content for updates.
                            </div>
                          )}
                          {item.action_type === "rejected" && (
                            <div className="status-info status-rejected">
                              Rejected. If you need further assistance, contact support.
                            </div>
                          )}
                          {item.action_type === "review" && (
                            <div className="status-info status-review">
                              Under review. You will be notified when a decision is made.
                            </div>
                          )}
                        </div>

                        <div className="notification-footer">
                          <span className="timestamp">
                            {new Date(item.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </li>
                    )
                  )}
                </ul>

                {/* Pagination Controls */}
                {filteredItems.length >= ITEMS_PER_PAGE && (
                  <div className="pagination-controls">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="pagination-btn"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
