import "../pages/FindMatchPage.css";
import "./NotificationBox.css"; // warm dog-lover theme
import React, { useEffect, useState } from "react";
import { fetchReportRepliesForUser } from "../lib/reportReplies";
import { useAuth } from "../context/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

import AccordionList from "./AccordionList";

export default function NotificationBox() {
  const { user } = useAuth();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetchReportRepliesForUser(user.id)
      .then((data) => {
        setReplies(data || []);
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
        <h1 className="page-title">Report Replies</h1>
        <p className="page-description">View responses to your submitted reports from admins</p>
      </div>

      {/* Main Content */}
      <div className="content-section">
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
