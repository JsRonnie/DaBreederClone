import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import ConfirmDialog from "../components/ConfirmDialog";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import { sendBanNotificationEmail } from "../lib/banNotification";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, deactivated
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(""); // ban, reactivate, delete
  const [notification, setNotification] = useState(null); // { type, message }
  const [banReason, setBanReason] = useState(""); // Reason for banning
  const [showBanReasonModal, setShowBanReasonModal] = useState(false); // Modal for ban reason

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Reset to first page if filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    try {
      console.log("AdminUsersPage: Checking admin access...");
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("Session:", session ? "Found" : "Not found", sessionError);

      if (!session) {
        console.log("No session, redirecting to /admin");
        navigate("/admin");
        return;
      }

      console.log("User ID:", session.user.id);

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      console.log("Profile role:", profile?.role, profileError);

      if (profile?.role !== "admin") {
        console.log("Not an admin, redirecting to /admin");
        navigate("/admin");
        return;
      }

      console.log("Admin access confirmed, fetching users");
      await fetchUsers();
    } catch (err) {
      console.error("Admin access check failed:", err);
      navigate("/admin");
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          email,
          name,
          role,
          created_at,
          avatar_url,
          is_active
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (user, action) => {
    // Map 'deactivate' to 'ban' for UI consistency
    setSelectedUser(user);
    const finalAction = action === "deactivate" ? "ban" : action;
    setActionType(finalAction);

    // If banning, open the ban reason modal first
    if (finalAction === "ban") {
      setShowBanReasonModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const confirmAction = async () => {
    if (!selectedUser) return;

    try {
      if (actionType === "ban") {
        const { error } = await supabase
          .from("users")
          .update({
            is_active: false,
            banned_at: new Date().toISOString(),
            ban_reason: banReason || "Terms of Service violation",
          })
          .eq("id", selectedUser.id);

        if (error) throw error;

        // Send ban notification email
        await sendBanNotificationEmail(
          selectedUser.email,
          selectedUser.name,
          banReason || "Terms of Service violation"
        );

        setNotification({
          type: "success",
          message: `User ${selectedUser.email} has been banned. Notification sent.`,
        });
      } else if (actionType === "reactivate") {
        const { error } = await supabase
          .from("users")
          .update({
            is_active: true,
            banned_at: null,
            ban_reason: null,
          })
          .eq("id", selectedUser.id);

        if (error) throw error;
        setNotification({
          type: "success",
          message: `User ${selectedUser.email} has been unbanned.`,
        });
      } else if (actionType === "delete") {
        // Note: This only marks as deleted, doesn't actually delete from auth
        const { error } = await supabase.from("users").delete().eq("id", selectedUser.id);

        if (error) throw error;
        setNotification({
          type: "success",
          message: `User ${selectedUser.email} has been deleted.`,
        });
      }

      await fetchUsers();
      setShowConfirmModal(false);
      setShowBanReasonModal(false);
      setSelectedUser(null);
      setActionType("");
      setBanReason("");

      // Clear notification after 4 seconds
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Action failed:", err);
      setNotification({ type: "error", message: "Failed to perform action. Please try again." });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && user.is_active !== false) ||
      (filterStatus === "deactivated" && user.is_active === false);

    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  if (loading) {
    return <AdminLoadingScreen message="Loading users..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium z-40 animate-pulse ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {notification.message}
        </div>
      )}
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="rounded-full p-2 hover:bg-slate-100 transition-colors text-slate-500"
            title="Back to Dashboard"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
            <p className="text-sm text-slate-500 mt-1">Manage all registered users</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-100 p-4 sm:p-6 mb-8 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center justify-between">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-700 placeholder:text-slate-400"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-48 px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
            >
              <option value="all">All Users</option>
              <option value="active">Active Users</option>
              <option value="deactivated">Banned Users</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-2">
            <span>
              Total: <span className="font-semibold text-slate-700">{filteredUsers.length}</span>
            </span>
            <span>
              Active:{" "}
              <span className="font-semibold text-green-600">
                {filteredUsers.filter((u) => u.is_active !== false).length}
              </span>
            </span>
            <span>
              Banned:{" "}
              <span className="font-semibold text-red-500">
                {filteredUsers.filter((u) => u.is_active === false).length}
              </span>
            </span>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-100 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="text-slate-300 flex flex-col items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-12 h-12 mb-2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                        />
                      </svg>
                      <span className="text-lg font-medium">No users found</span>
                      <span className="text-xs">Try adjusting your filters</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 transition border-b border-slate-100"
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            user.avatar_url ||
                            `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.email || "U")}`
                          }
                          alt={user.name}
                          className="w-10 h-10 rounded-full border border-slate-200 shadow-sm object-cover bg-slate-100"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">
                            {user.name || "No Name"}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {user.role || "user"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${user.is_active === false ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                      >
                        {user.is_active === false ? "Banned" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-xs text-slate-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.role !== "admin" && (
                          <>
                            {user.is_active === false ? (
                              <button
                                onClick={() => handleActionClick(user, "reactivate")}
                                className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition text-xs"
                                title="Reactivate"
                              >
                                ✓
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActionClick(user, "ban")}
                                className="p-2 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-600 transition"
                                title="Ban"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleActionClick(user, "delete")}
                              className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition"
                              title="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                              </svg>
                            </button>
                          </>
                        )}
                        {user.role === "admin" && (
                          <span className="text-xs text-slate-400 font-medium">Admin</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Pagination Controls at the bottom of the page */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 max-w mx-auto px-4 py-4 border-t border-slate-100 bg-white/80 rounded-b-2xl shadow-lg mt-0">
          <button
            className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition disabled:opacity-50 text-sm font-medium"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            &larr;
          </button>
          <span className="text-sm text-slate-600">
            Page <span className="font-semibold">{currentPage}</span> of{" "}
            <span className="font-semibold">{totalPages}</span>
          </span>
          <button
            className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition disabled:opacity-50 text-sm font-medium"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            &rarr;
          </button>
        </div>
      )}

      {/* Ban Reason Modal */}
      {showBanReasonModal && selectedUser && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Ban User</h3>
            <p className="text-slate-600 mb-4">
              Please provide a reason for banning <strong>{selectedUser.email}</strong>
            </p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="E.g., Harassment, Spam, Terms of Service violation..."
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-200 text-slate-700 placeholder:text-slate-400 resize-none h-32 mb-4"
            />
            <p className="text-xs text-slate-500 mb-4">
              This reason will be sent to the user in a notification email.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowBanReasonModal(false);
                  setSelectedUser(null);
                  setActionType("");
                  setBanReason("");
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBanReasonModal(false);
                  setShowConfirmModal(true);
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
              >
                Continue with Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedUser && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              {actionType === "ban"
                ? "Ban User"
                : actionType === "delete"
                  ? "Delete User Profile"
                  : "Unban User"}
            </h3>
            <p className="text-slate-600 mb-2">
              {actionType === "ban" && `Are you sure you want to ban ${selectedUser.email}?`}
              {actionType === "delete" &&
                `Are you sure you want to delete ${selectedUser.email}'s profile?`}
              {actionType === "reactivate" &&
                `Are you sure you want to unban ${selectedUser.email}?`}
            </p>
            <p className="text-sm text-slate-500 mb-6">
              {actionType === "ban" && "This will prevent the user from accessing their account."}
              {actionType === "delete" &&
                "This action cannot be undone and will permanently remove all information, photos, and documents."}
              {actionType === "reactivate" &&
                "The user will be able to access their account again."}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedUser(null);
                  setActionType("");
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${
                  actionType === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : actionType === "ban"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {actionType === "ban" && "Ban"}
                {actionType === "delete" && "Delete"}
                {actionType === "reactivate" && "Unban"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
