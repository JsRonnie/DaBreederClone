import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import AdminLoadingScreen from "../components/AdminLoadingScreen";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  // ...existing code...

  useEffect(() => {
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Wait a moment for session to be fully established
      await new Promise((resolve) => setTimeout(resolve, 200));

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        navigate("/admin");
        return;
      }

      if (!session) {
        console.log("No session found, redirecting to admin login");
        navigate("/admin");
        return;
      }

      console.log("Session found, user ID:", session.user.id);

      // Check if user has admin role - try with email if id doesn't work
      let profile = null;
      let error = null;

      // First try by ID
      const result1 = await supabase
        .from("users")
        .select("role, name, email")
        .eq("id", session.user.id)
        .maybeSingle();

      if (result1.data) {
        profile = result1.data;
      } else {
        // Try by email as fallback
        const result2 = await supabase
          .from("users")
          .select("role, name, email")
          .eq("email", session.user.email)
          .maybeSingle();

        profile = result2.data;
        error = result2.error;
      }

      console.log("User profile:", profile);
      console.log("Profile error:", error);

      if (!profile) {
        console.error("No profile found for user");
        alert("Error: No user profile found. Please contact administrator.");
        await supabase.auth.signOut();
        navigate("/admin");
        return;
      }

      if (profile?.role !== "admin") {
        console.log("User is not admin, role:", profile?.role);
        alert("Access denied. Admin credentials required.");
        await supabase.auth.signOut();
        navigate("/admin");
        return;
      }

      console.log("✅ Admin access granted");
      setAdminUser({
        email: session.user.email,
        name: profile.name || "Admin",
      });

      // Fetch dashboard statistics
      await fetchStats();
    } catch (err) {
      console.error("Admin access check failed:", err);
      alert("Error checking admin access: " + err.message);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log("📊 Fetching dashboard statistics...");

      // Get total users
      const { count: usersCount, error: usersError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      if (usersError) console.error("Error fetching users:", usersError);
      console.log("Total users:", usersCount);

      // Get total dogs
      const { count: dogsCount, error: dogsError } = await supabase
        .from("dogs")
        .select("*", { count: "exact", head: true });

      if (dogsError) console.error("Error fetching dogs:", dogsError);
      console.log("Total dogs:", dogsCount);

      // Get total matches made (total contacts made between users)
      const { count: matchesCount, error: matchesError } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true });

      if (matchesError) console.error("Error fetching contacts:", matchesError);
      console.log("Total matches:", matchesCount);

      // Get all contacts with their messages to determine status
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("id");

      if (contactsError) console.error("Error fetching contacts data:", contactsError);

      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("contact_id, sender_id");

      if (messagesError) console.error("Error fetching messages:", messagesError);

      // Pending contact messages: contacts that exist but have no messages yet
      const contactsWithMessages = new Set(messagesData?.map((m) => m.contact_id) || []);
      const pendingContacts =
        contactsData?.filter((c) => !contactsWithMessages.has(c.id)).length || 0;
      console.log("Pending contacts:", pendingContacts);

      // Active conversations: contacts where both parties have sent messages
      const conversationActivity = {};
      messagesData?.forEach((msg) => {
        if (!conversationActivity[msg.contact_id]) {
          conversationActivity[msg.contact_id] = new Set();
        }
        conversationActivity[msg.contact_id].add(msg.sender_id);
      });
      const activeConversations = Object.values(conversationActivity).filter(
        (senders) => senders.size >= 2
      ).length;
      console.log("Active conversations:", activeConversations);

      // Get total forum posts (threads table = forum posts)
      const { count: threadsCount, error: threadsError } = await supabase
        .from("threads")
        .select("*", { count: "exact", head: true });

      if (threadsError) console.error("Error fetching threads:", threadsError);
      console.log("Total forum posts (threads):", threadsCount);

      // Get total comments
      const { count: commentsCount, error: commentsError } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true });

      if (commentsError) console.error("Error fetching comments:", commentsError);
      console.log("Total comments:", commentsCount);

      // Get pending contact messages from contact form
      const { count: contactMessagesCount, error: contactMessagesError } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (contactMessagesError) {
        console.error("Error fetching contact messages:", contactMessagesError);
        console.error("This error might mean the contact_messages table doesn't exist yet.");
        console.log(
          "To fix: Run the SQL migration in supabase/sql/create_contact_messages_table.sql"
        );
      }
      console.log("Pending contact messages:", contactMessagesCount);

      // Get pending document verifications (dogs with documents)
      const { count: dogsWithDocs, error: docsError } = await supabase
        .from("dogs")
        .select("*", { count: "exact", head: true })
        .not("documents", "is", null);

      if (docsError) console.error("Error fetching dogs with documents:", docsError);
      console.log("Dogs with documents:", dogsWithDocs);

      const statsData = {
        totalUsers: usersCount || 0,
        totalDogs: dogsCount || 0,
        totalMatches: matchesCount || 0,
        activeChats: activeConversations,
        totalForumThreads: commentsCount || 0, // comments table = total comments
        totalForumPosts: threadsCount || 0, // threads table = forum posts
        pendingMessages: contactMessagesCount || 0, // pending contact form messages
        pendingDocuments: dogsWithDocs || 0,
      };

      console.log("✅ Stats fetched successfully:", statsData);
      // ...existing code...
    } catch (err) {
      console.error("❌ Failed to fetch stats:", err);
      alert("Error loading dashboard statistics. Please refresh the page.");
    }
  };

  const handleSignOut = async () => {
    try {
      console.log("Admin signing out...");

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
      }

      // Clear local storage
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.includes("supabase") || k.includes("sb-")) {
          localStorage.removeItem(k);
        }
      }

      // Clear session storage
      const sessionKeys = Object.keys(sessionStorage);
      for (const k of sessionKeys) {
        if (k.includes("supabase") || k.includes("sb-")) {
          sessionStorage.removeItem(k);
        }
      }

      console.log("Admin signed out successfully");

      // Hard redirect to admin login page
      window.location.href = "/admin";
    } catch (err) {
      console.error("Sign out failed:", err);
      // Force redirect even if there's an error
      window.location.href = "/admin";
    }
  };

  if (loading) {
    return <AdminLoadingScreen message="Loading admin dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-sm text-slate-600">DaBreeder Administration</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{adminUser?.name}</p>
                <p className="text-xs text-slate-600">{adminUser?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">System Overview</h2>
          <p className="text-slate-600">
            Manage Users, Manage Dog Profiles, Manage Forum, Contact Messages
          </p>
        </div>

        {/* Stats Grid - 2 rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Manage Users */}
          <button
            onClick={() => navigate("/admin/users")}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-blue-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Manage Users</p>
            <p className="text-xs text-slate-500 mt-2">View and manage user accounts</p>
          </button>

          {/* Manage Dog Profiles */}
          <button
            onClick={() => navigate("/admin/dogs")}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-green-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Manage Dog Profiles</p>
            <p className="text-xs text-slate-500 mt-2">View and manage dog profiles</p>
          </button>

          {/* Manage Forum */}
          <button
            onClick={() => navigate("/admin/forum")}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-indigo-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Manage Forum</p>
            <p className="text-xs text-slate-500 mt-2">Moderate forum posts and threads</p>
          </button>

          {/* Contact Messages */}
          <button
            onClick={() => navigate("/admin/messages")}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-orange-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Contact Messages</p>
            <p className="text-xs text-slate-500 mt-2">View and respond to contact form messages</p>
          </button>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 text-slate-300 mx-auto mb-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
              />
            </svg>
            <p className="text-slate-600 font-medium mb-1">Activity Monitoring</p>
            <p className="text-sm text-slate-500">Recent platform activity will appear here</p>
          </div>
        </div>
      </main>
    </div>
  );
}
