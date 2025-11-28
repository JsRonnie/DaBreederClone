import "./NotificationBox.css"; // warm dog-lover theme
import React, { useEffect, useState } from "react";
import { fetchReportRepliesForUser } from "../lib/reportReplies";
import { useAuth } from "../context/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import AccordionList from "./AccordionList";

import supabase from "../lib/supabaseClient";

export default function NotificationBox() {
  const { user } = useAuth();
  const [replies, setReplies] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (!user?.id) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please sign in to view your report replies.
      </div>
    );
  }

  return (
    <div className="find-match-container">
      {/* Header Section - matches MyDogs */}
      <div className="header-section">
        <h1 className="page-title">Notifications & Report Replies</h1>
        <p className="page-description">
          View all notifications and admin responses to your reports
        </p>
      </div>

      {/* Main Content */}
      <div className="content-section">
        <Card className="shadow-lg border-none bg-white/80 backdrop-blur rounded-2xl mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <svg className="animate-spin h-6 w-6 text-blue-400 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-muted-foreground">Loading notifications…</span>
              </div>
            ) : error ? (
              <div className="text-red-600 text-center py-8">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="text-muted-foreground text-center py-6">No notifications yet.</div>
            ) : (
              <ul className="space-y-3">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`rounded-lg p-3 border ${notif.is_read ? "bg-gray-50" : "bg-yellow-50"}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-800">
                        {notif.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 mt-1">
                      {notif.message.includes("Reason:") ? (
                        <>
                          {notif.message.split("Reason:")[0]}
                          <span className="font-semibold text-red-600">
                            Reason:{notif.message.split("Reason:")[1]}
                          </span>
                        </>
                      ) : (
                        notif.message
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none bg-white/80 backdrop-blur rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
              Report Replies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-6 w-6 text-blue-400 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-muted-foreground">Loading replies…</span>
              </div>
            ) : error ? (
              <div className="text-red-600 text-center py-8">{error}</div>
            ) : replies.length === 0 ? (
              <div className="text-muted-foreground text-center py-12">
                No replies to your reports yet.
                <br />
                You will be notified here when an admin responds.
              </div>
            ) : (
              <AccordionList replies={replies} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
