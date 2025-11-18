import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import AdminLoadingScreen from "../components/AdminLoadingScreen";

export default function AdminForumPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("threads");
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({ totalThreads: 0, totalComments: 0 });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null,
    itemId: null,
    itemTitle: "",
    userId: null,
    userName: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, view]);

  useEffect(() => {
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "admin") {
        navigate("/admin");
        return;
      }

      await fetchForumData();
    } catch (err) {
      console.error("Admin access check failed:", err);
      navigate("/admin");
    }
  };

  const fetchForumData = async () => {
    try {
      setLoading(true);

      // Fetch threads with user info
      const { data: threadsData, error: threadsError } = await supabase
        .from("threads")
        .select(`id, title, content, created_at, user_id, author_id`)
        .order("created_at", { ascending: false });

      if (threadsError) throw threadsError;

      // Fetch user info for threads
      const threadUserIds = [...new Set(threadsData?.map((t) => t.user_id || t.author_id) || [])];
      const { data: threadUsers = {} } =
        threadUserIds.length > 0
          ? await supabase
              .from("users")
              .select("id, name, email, is_active")
              .in("id", threadUserIds)
          : { data: [] };

      const threadUsersMap = Object.fromEntries(threadUsers.map((u) => [u.id, u]));

      const enrichedThreads =
        threadsData?.map((thread) => ({
          ...thread,
          users: threadUsersMap[thread.user_id || thread.author_id],
        })) || [];

      // Fetch comments with thread info
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(`id, content, created_at, user_id, author_id, thread_id`)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      // Fetch user info for comments
      const commentUserIds = [...new Set(commentsData?.map((c) => c.user_id || c.author_id) || [])];
      const { data: commentUsers = [] } =
        commentUserIds.length > 0
          ? await supabase
              .from("users")
              .select("id, name, email, is_active")
              .in("id", commentUserIds)
          : { data: [] };

      const commentUsersMap = Object.fromEntries(commentUsers.map((u) => [u.id, u]));

      // Fetch thread titles for comments
      const threadIds = [...new Set(commentsData?.map((c) => c.thread_id) || [])];
      const { data: threadTitles = [] } =
        threadIds.length > 0
          ? await supabase.from("threads").select("id, title").in("id", threadIds)
          : { data: [] };

      const threadTitlesMap = Object.fromEntries(threadTitles.map((t) => [t.id, t]));

      const enrichedComments =
        commentsData?.map((comment) => ({
          ...comment,
          users: commentUsersMap[comment.user_id || comment.author_id],
          threads: threadTitlesMap[comment.thread_id],
        })) || [];

      setThreads(enrichedThreads);
      setComments(enrichedComments);
      setStats({
        totalThreads: enrichedThreads.length,
        totalComments: enrichedComments.length,
      });
    } catch (err) {
      console.error("Error in fetchForumData:", err);
      setNotification({ type: "error", message: "Failed to load forum data." });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (action, itemId, itemTitle, userId = null, userName = "") => {
    setConfirmDialog({ open: true, action, itemId, itemTitle, userId, userName });
  };

  const confirmAction = async () => {
    const { action, itemId, userId } = confirmDialog;

    try {
      if (action === "deleteThread") {
        await supabase.from("comments").delete().eq("thread_id", itemId);
        const { error } = await supabase.from("threads").delete().eq("id", itemId);
        if (error) throw error;
        setNotification({ type: "success", message: "Thread deleted." });
      } else if (action === "deleteComment") {
        const { error } = await supabase.from("comments").delete().eq("id", itemId);
        if (error) throw error;
        setNotification({ type: "success", message: "Comment deleted." });
      } else if (action === "banUser") {
        const { error } = await supabase
          .from("users")
          .update({ is_active: false })
          .eq("id", userId);
        if (error) throw error;
        setNotification({ type: "success", message: "User banned." });
      }

      await fetchForumData();
      setConfirmDialog({
        open: false,
        action: null,
        itemId: null,
        itemTitle: "",
        userId: null,
        userName: "",
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Error:", err);
      setNotification({ type: "error", message: "Action failed." });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const filteredThreads = threads.filter((thread) => {
    const matchesSearch =
      thread.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.users?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredComments = comments.filter((comment) => {
    const matchesSearch =
      comment.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.threads?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPagesThreads = Math.ceil(filteredThreads.length / rowsPerPage);
  const paginatedThreads = filteredThreads.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPagesComments = Math.ceil(filteredComments.length / rowsPerPage);
  const paginatedComments = filteredComments.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const viewThread = (threadId) => {
    window.open(`/thread/${threadId}`, "_blank");
  };

  if (loading) {
    return <AdminLoadingScreen message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {notification && (
        <div
          className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium z-40 ${notification.type === "success" ? "bg-green-500" : "bg-red-500"}`}
        >
          {notification.message}
        </div>
      )}

      <header className="bg-white/80 backdrop-blur border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="rounded-full p-2 hover:bg-slate-100 text-slate-500"
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
            <h1 className="text-2xl font-bold text-slate-900">Manage Forum</h1>
            <p className="text-sm text-slate-500 mt-1">
              View all posts and comments, delete inappropriate content
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/90 rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Posts</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">{stats.totalThreads}</div>
          </div>
          <div className="bg-white/90 rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Comments</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats.totalComments}</div>
          </div>
        </div>

        <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:flex-1 px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setView("threads");
                  setCurrentPage(1);
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium ${view === "threads" ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200"}`}
              >
                Posts ({filteredThreads.length})
              </button>
              <button
                onClick={() => {
                  setView("comments");
                  setCurrentPage(1);
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium ${view === "comments" ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200"}`}
              >
                Comments ({filteredComments.length})
              </button>
            </div>
          </div>
        </div>

        {view === "threads" && (
          <>
            <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-100 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">
                      Post
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">
                      Author
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedThreads.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                        No posts found
                      </td>
                    </tr>
                  ) : (
                    paginatedThreads.map((thread) => (
                      <tr key={thread.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900 truncate">{thread.title}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">{thread.users?.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${thread.users?.is_active === false ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                          >
                            {thread.users?.is_active === false ? "Banned" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(thread.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => viewThread(thread.id)}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteClick("deleteThread", thread.id, thread.title)
                              }
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z" />
                              </svg>
                            </button>
                            {thread.users?.is_active !== false && (
                              <button
                                onClick={() =>
                                  handleDeleteClick(
                                    "banUser",
                                    null,
                                    thread.title,
                                    thread.user_id,
                                    thread.users?.name
                                  )
                                }
                                className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPagesThreads > 1 && (
              <div className="flex justify-center gap-3 mt-4">
                <button
                  className="px-3 py-2 bg-slate-100 rounded disabled:opacity-50"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  &larr;
                </button>
                <span className="text-sm">
                  Page {currentPage} of {totalPagesThreads}
                </span>
                <button
                  className="px-3 py-2 bg-slate-100 rounded disabled:opacity-50"
                  onClick={() => setCurrentPage((p) => Math.min(totalPagesThreads, p + 1))}
                  disabled={currentPage === totalPagesThreads}
                >
                  &rarr;
                </button>
              </div>
            )}
          </>
        )}

        {view === "comments" && (
          <>
            <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-100 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">
                      Comment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">
                      Thread
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">
                      Author
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedComments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                        No comments found
                      </td>
                    </tr>
                  ) : (
                    paginatedComments.map((comment) => (
                      <tr key={comment.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-900 line-clamp-1">{comment.content}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-900 line-clamp-1">
                            {comment.threads?.title}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">{comment.users?.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${comment.users?.is_active === false ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                          >
                            {comment.users?.is_active === false ? "Banned" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => viewThread(comment.thread_id)}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteClick(
                                  "deleteComment",
                                  comment.id,
                                  comment.content.substring(0, 50)
                                )
                              }
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z" />
                              </svg>
                            </button>
                            {comment.users?.is_active !== false && (
                              <button
                                onClick={() =>
                                  handleDeleteClick(
                                    "banUser",
                                    null,
                                    comment.content.substring(0, 50),
                                    comment.user_id,
                                    comment.users?.name
                                  )
                                }
                                className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPagesComments > 1 && (
              <div className="flex justify-center gap-3 mt-4">
                <button
                  className="px-3 py-2 bg-slate-100 rounded disabled:opacity-50"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  &larr;
                </button>
                <span className="text-sm">
                  Page {currentPage} of {totalPagesComments}
                </span>
                <button
                  className="px-3 py-2 bg-slate-100 rounded disabled:opacity-50"
                  onClick={() => setCurrentPage((p) => Math.min(totalPagesComments, p + 1))}
                  disabled={currentPage === totalPagesComments}
                >
                  &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              {confirmDialog.action === "deleteThread"
                ? "Delete Post"
                : confirmDialog.action === "deleteComment"
                  ? "Delete Comment"
                  : "Ban User"}
            </h3>
            <p className="text-slate-600 mb-6">
              {confirmDialog.action === "deleteThread"
                ? "Delete this post and all comments?"
                : confirmDialog.action === "deleteComment"
                  ? "Delete this comment?"
                  : "Ban this user?"}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setConfirmDialog({
                    open: false,
                    action: null,
                    itemId: null,
                    itemTitle: "",
                    userId: null,
                    userName: "",
                  })
                }
                className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 text-sm font-bold text-white rounded ${confirmDialog.action === "deleteThread" || confirmDialog.action === "deleteComment" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}
              >
                {confirmDialog.action === "deleteThread" || confirmDialog.action === "deleteComment"
                  ? "Delete"
                  : "Ban"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
