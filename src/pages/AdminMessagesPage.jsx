import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import AdminModal from "../components/AdminModal";
import AdminLoadingScreen from "../components/AdminLoadingScreen";

export default function AdminMessagesPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, pending, resolved
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
  });

  useEffect(() => {
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    try {
      console.log("AdminMessagesPage: Checking admin access...");
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

      console.log("Admin access confirmed, fetching messages");
      await fetchMessages();
    } catch (err) {
      console.error("Admin access check failed:", err);
      navigate("/admin");
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      console.log("Fetched messages:", data?.length || 0);
      setMessages(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const pending = data?.filter((m) => m.status === "pending").length || 0;
      const resolved = data?.filter((m) => m.status === "resolved").length || 0;

      setStats({ total, pending, resolved });
    } catch (err) {
      console.error("Error in fetchMessages:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsResolved = async (messageId) => {
    try {
      const { error } = await supabase
        .from("contact_messages")
        .update({ status: "resolved" })
        .eq("id", messageId);

      if (error) throw error;

      console.log("Message marked as resolved:", messageId);
      await fetchMessages();

      // Close modal if it's open
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error("Error marking message as resolved:", err);
      alert("Failed to mark message as resolved. Please try again.");
    }
  };

  const markAsPending = async (messageId) => {
    try {
      const { error } = await supabase
        .from("contact_messages")
        .update({ status: "pending" })
        .eq("id", messageId);

      if (error) throw error;

      console.log("Message marked as pending:", messageId);
      await fetchMessages();
    } catch (err) {
      console.error("Error marking message as pending:", err);
      alert("Failed to mark message as pending. Please try again.");
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) {
      alert("Please enter a reply message.");
      return;
    }

    try {
      setSending(true);

      // In a real application, you would send an email here
      // For now, we'll just update the status and add a note
      const { error } = await supabase
        .from("contact_messages")
        .update({
          status: "resolved",
          admin_reply: replyText,
          replied_at: new Date().toISOString(),
        })
        .eq("id", selectedMessage.id);

      if (error) throw error;

      console.log("Reply sent for message:", selectedMessage.id);
      alert(
        `Reply sent to ${selectedMessage.email}!\n\nNote: In production, this would send an actual email.`
      );

      setReplyText("");
      setSelectedMessage(null);
      await fetchMessages();
    } catch (err) {
      console.error("Error sending reply:", err);
      alert("Failed to send reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = messages.filter((message) => {
    // Search filter
    const matchesSearch =
      message.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.message?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (filterStatus === "pending" && message.status !== "pending") return false;
    if (filterStatus === "resolved" && message.status !== "resolved") return false;

    return true;
  });

  if (loading) {
    return <AdminLoadingScreen message="Loading messages..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Contact Messages</h1>
              <p className="text-sm text-slate-600 mt-1">
                View and respond to messages from the contact form
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Messages</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Pending</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Resolved</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats.resolved}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name, email, subject, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Messages</option>
                <option value="pending">Pending Only</option>
                <option value="resolved">Resolved Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messages Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No messages found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {searchTerm || filterStatus !== "all"
                            ? "Try adjusting your search or filters"
                            : "No contact form submissions yet"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((message) => (
                    <tr key={message.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{message.name}</div>
                        <div className="text-sm text-gray-500">{message.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 line-clamp-2">{message.subject}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 line-clamp-2">{message.message}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            message.status === "resolved"
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {message.status === "resolved" ? "Resolved" : "Pending"}
                        </span>
                        {message.admin_reply && (
                          <div className="text-xs text-blue-600 mt-1">✓ Replied</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(message.created_at).toLocaleDateString()}
                        <div className="text-xs text-gray-400">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedMessage(message)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View/Reply
                        </button>
                        {message.status === "pending" ? (
                          <button
                            onClick={() => markAsResolved(message.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Resolve
                          </button>
                        ) : (
                          <button
                            onClick={() => markAsPending(message.id)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Reopen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <AdminModal
          isOpen={true}
          onClose={() => setSelectedMessage(null)}
          title="Contact Message"
          maxWidth="2xl"
        >
          {/* Modal Body */}
          <div className="px-6 py-4">
            {/* Status Badge */}
            <div className="mb-4">
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  selectedMessage.status === "resolved"
                    ? "bg-green-100 text-green-800"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                {selectedMessage.status === "resolved" ? "Resolved" : "Pending"}
              </span>
            </div>

            {/* Contact Info */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-500 mb-2">From</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-900">{selectedMessage.name}</p>
                <p className="text-sm text-slate-600">{selectedMessage.email}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Sent on {new Date(selectedMessage.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Subject */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-500 mb-2">Subject</h3>
              <p className="text-base text-slate-900">{selectedMessage.subject}</p>
            </div>

            {/* Message */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-500 mb-2">Message</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-900 whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>
            </div>

            {/* Previous Reply */}
            {selectedMessage.admin_reply && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-500 mb-2">Previous Reply</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {selectedMessage.admin_reply}
                  </p>
                  {selectedMessage.replied_at && (
                    <p className="text-xs text-slate-500 mt-2">
                      Replied on {new Date(selectedMessage.replied_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Reply Form */}
            {selectedMessage.status === "pending" && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Send Reply</h3>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Note: In production, this would send an email to {selectedMessage.email}
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-200 px-6 py-4 flex gap-3 justify-end bg-slate-50">
            <button
              onClick={() => setSelectedMessage(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            {selectedMessage.status === "pending" ? (
              <>
                <button
                  onClick={() => markAsResolved(selectedMessage.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Mark as Resolved
                </button>
                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? "Sending..." : "Send Reply & Resolve"}
                </button>
              </>
            ) : (
              <button
                onClick={() => markAsPending(selectedMessage.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Reopen
              </button>
            )}
          </div>
        </AdminModal>
      )}
    </div>
  );
}
