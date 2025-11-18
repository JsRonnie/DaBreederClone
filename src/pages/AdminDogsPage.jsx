import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import ConfirmDialog from "../components/ConfirmDialog";
import AdminLoadingScreen from "../components/AdminLoadingScreen";

export default function AdminDogsPage() {
  const navigate = useNavigate();
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDocuments, setFilterDocuments] = useState("all"); // all, verified, pending, none
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null,
    dogId: null,
    dogName: "",
  });
  const [stats, setStats] = useState({ total: 0, withDocs: 0 });
  const [docModal, setDocModal] = useState({
    open: false,
    dog: null,
    documents: [],
    loading: false,
  });
  const [docActionLoading, setDocActionLoading] = useState(false);
  const [notification, setNotification] = useState(null); // { type, message }
  const [documentViewer, setDocumentViewer] = useState({ open: false, document: null }); // { open, document }

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Reset to first page if filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDocuments]);

  useEffect(() => {
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    try {
      console.log("AdminDogsPage: Checking admin access...");
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

      console.log("Admin access confirmed, fetching dogs");
      await fetchDogs();
    } catch (err) {
      console.error("Admin access check failed:", err);
      navigate("/admin");
    }
  };

  const fetchDogs = async () => {
    try {
      setLoading(true);

      // Fetch dogs with their owner information and documents
      const { data, error: dogsError } = await supabase
        .from("dogs")
        .select(
          `
          id,
          user_id,
          name,
          gender,
          breed,
          age_years,
          weight_kg,
          pedigree_certified,
          dna_tested,
          vaccinated,
          hip_elbow_tested,
          heart_tested,
          eye_tested,
          genetic_panel,
          thyroid_tested,
          coat_type,
          color,
          activity_level,
          sociability,
          trainability,
          created_at,
          image_url,
          users!dogs_user_id_fkey (
            id,
            name,
            email
          ),
          dog_documents (
            id,
            file_name,
            storage_path,
            file_size_bytes,
            content_type,
            category,
            uploaded_at
          )
        `
        )
        .order("created_at", { ascending: false });

      if (dogsError) {
        console.error("Error fetching dogs:", dogsError);
        return;
      }

      console.log("Fetched dogs:", data?.length || 0);

      // Attach documentCount from nested dog_documents
      const dogsWithDocs = (data || []).map((dog) => ({
        ...dog,
        documentCount: (dog.dog_documents || []).length,
      }));

      setDogs(dogsWithDocs);

      // Calculate stats
      const total = dogsWithDocs?.length || 0;
      const withDocs = dogsWithDocs?.filter((d) => d.documentCount > 0).length || 0;

      setStats({ total, visible: total, hidden: 0, withDocs });
    } catch (err) {
      console.error("Error in fetchDogs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action, dogId, dogName) => {
    setConfirmDialog({
      open: true,
      action,
      dogId,
      dogName,
    });
  };

  const confirmAction = async () => {
    const { action, dogId } = confirmDialog;

    try {
      if (action === "delete") {
        const { error } = await supabase.from("dogs").delete().eq("id", dogId);

        if (error) throw error;
        console.log("Dog deleted:", dogId);
        setNotification({
          type: "success",
          message: `Dog "${confirmDialog.dogName}" has been deleted.`,
        });
      }

      // Refresh the list
      await fetchDogs();
      setConfirmDialog({ open: false, action: null, dogId: null, dogName: "" });

      // Clear notification after 4 seconds
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setNotification({ type: "error", message: "Failed to delete dog. Please try again." });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Fetch documents for a dog and open modal
  const openDocModal = async (dog) => {
    // Use documents already fetched with the dog (nested select)
    setDocModal({ open: true, dog, documents: dog.dog_documents || [], loading: false });
  };

  // Verify or reject a document
  const handleDocAction = async (docId, action) => {
    setDocActionLoading(true);
    let update = {};
    if (action === "verify") {
      update = { verified: true, rejected: false };
    } else if (action === "reject") {
      update = { verified: false, rejected: true };
    }
    try {
      const { error } = await supabase.from("dog_documents").update(update).eq("id", docId);

      if (error) {
        // If the DB doesn't have verification columns, give guidance
        const msg = (error.message || error.details || "").toLowerCase();
        if (msg.includes("column") || msg.includes("does not exist")) {
          alert(
            "Document verification is not enabled in the database. Please use the Documents manager or add verification columns to the dog_documents table."
          );
        } else {
          alert("Failed to update document status.");
        }
      } else {
        // Refresh documents in modal (use nested documents from dog object)
        await openDocModal(docModal.dog);
      }
    } catch (err) {
      console.error("Error updating document status:", err);
      alert("An unexpected error occurred while updating document status.");
    }
    setDocActionLoading(false);
  };

  const filteredDogs = dogs.filter((dog) => {
    // Search filter
    const matchesSearch =
      dog.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dog.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dog.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dog.users?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Documents filter (use nested dog_documents from fetch)
    const docs = dog.dog_documents || [];
    if (filterDocuments === "none" && docs.length > 0) return false;
    if (filterDocuments === "pending") {
      // pending = has documents but none verified/rejected
      const hasVerified = docs.some((d) => d.verified);
      const hasRejected = docs.some((d) => d.rejected);
      if (docs.length === 0) return false;
      if (hasVerified || hasRejected) return false;
    }
    if (filterDocuments === "verified") {
      const hasVerified = docs.some((d) => d.verified);
      if (!hasVerified) return false;
    }

    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredDogs.length / rowsPerPage);
  const paginatedDogs = filteredDogs.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getDocumentStatus = (dog) => {
    const count = dog.documentCount || 0;

    if (count === 0) return { text: "No Documents", color: "gray" };
    if (count === 1) return { text: "1 Document", color: "blue" };
    return { text: `${count} Documents`, color: "green" };
  };

  const viewDocuments = (dog) => {
    // Open modal to verify/reject documents
    openDocModal(dog);
  };

  if (loading) {
    return <AdminLoadingScreen message="Loading dogs..." />;
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Manage Dog Profiles
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              View, manage, and moderate all dog profiles
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6 mb-8">
          <div className="bg-white/90 rounded-xl shadow-sm border border-slate-100 p-4 md:p-6">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Dogs
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2">{stats.total}</div>
          </div>
          <div className="bg-white/90 rounded-xl shadow-sm border border-slate-100 p-4 md:p-6">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              With Documents
            </div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats.withDocs}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-100 p-4 sm:p-6 mb-8 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center justify-between">
            <input
              type="text"
              placeholder="Search by name, breed, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:flex-1 px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-700 placeholder:text-slate-400"
            />
            <select
              value={filterDocuments}
              onChange={(e) => setFilterDocuments(e.target.value)}
              className="w-full sm:w-48 px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
            >
              <option value="all">All</option>
              <option value="verified">With Documents</option>
              <option value="pending">Pending Docs</option>
              <option value="none">No Documents</option>
            </select>
          </div>
        </div>

        {/* Dogs Table */}
        <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-100 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Dog
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Health Tests
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <div className="text-slate-300 flex flex-col items-center gap-2">
                      <svg
                        className="w-12 h-12 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <span className="text-lg font-medium">No dogs found</span>
                      <span className="text-xs">
                        {searchTerm || filterDocuments !== "all"
                          ? "Try adjusting your search or filters"
                          : "No dogs have been registered yet"}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDogs.map((dog) => {
                  const docStatus = getDocumentStatus(dog);
                  return (
                    <tr
                      key={dog.id}
                      className="hover:bg-slate-50 transition border-b border-slate-100"
                    >
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={dog.image_url || "https://via.placeholder.com/150"}
                            alt={dog.name}
                            className="w-10 h-10 rounded-full border border-slate-200 shadow-sm object-cover bg-slate-100"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">
                              {dog.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {dog.breed} • {dog.age_years}y • {dog.gender}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm text-slate-900 font-medium">
                          {dog.users?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {dog.users?.email || "No email"}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {dog.vaccinated && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Vaccinated
                            </span>
                          )}
                          {dog.dna_tested && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              DNA
                            </span>
                          )}
                          {dog.pedigree_certified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              Pedigree
                            </span>
                          )}
                          {dog.heart_tested && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Heart
                            </span>
                          )}
                          {dog.hip_elbow_tested && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              Hip/Elbow
                            </span>
                          )}
                          {dog.eye_tested && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              Eyes
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span
                          className={`text-xs font-medium ${
                            docStatus.color === "green"
                              ? "text-green-600"
                              : docStatus.color === "blue"
                                ? "text-blue-600"
                                : "text-slate-500"
                          }`}
                        >
                          {docStatus.text}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-xs text-slate-600">
                        {new Date(dog.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewDocuments(dog)}
                            className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition"
                            title="View Documents"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.3-1.54c-.18-.22-.57-.22-.75 0-.17.21-.17.56 0 .77l1.68 2c.09.13.23.21.38.21.15 0 .29-.08.38-.21l3.13-4c.17-.21.17-.56 0-.77-.18-.21-.57-.21-.75 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleActionClick("delete", dog.id, dog.name)}
                            className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition"
                            title="Delete"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Pagination Controls at the bottom of the page */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 max-w-6xl mx-auto px-4 py-4 border-t border-slate-100 bg-white/80 rounded-b-2xl shadow-lg mt-0">
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

      {/* Confirmation Modal */}
      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Delete Dog Profile</h3>
            <p className="text-slate-600 mb-2">
              Are you sure you want to delete "{confirmDialog.dogName}"?
            </p>
            <p className="text-sm text-slate-500 mb-6">
              This action cannot be undone and will permanently remove all information, photos, and
              documents.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setConfirmDialog({ open: false, action: null, dogId: null, dogName: "" });
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Verification Modal */}
      {docModal.open && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Documents for {docModal.dog?.name || "Dog"}
              </h3>
              <button
                onClick={() =>
                  setDocModal({ open: false, dog: null, documents: [], loading: false })
                }
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {docModal.loading ? (
              <div className="text-center py-8">
                <div className="text-slate-500">Loading documents...</div>
              </div>
            ) : docModal.documents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No documents uploaded for this dog.
              </div>
            ) : (
              <div className="space-y-4">
                {docModal.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900 text-sm">{doc.file_name}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          {doc.category} • {doc.content_type} •{" "}
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <button
                        onClick={() => setDocumentViewer({ open: true, document: doc })}
                        className="px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium transition inline-flex items-center gap-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        View
                      </button>
                      {doc.verified ? (
                        <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          Verified
                        </span>
                      ) : doc.rejected ? (
                        <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          Rejected
                        </span>
                      ) : (
                        <>
                          <button
                            className="px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium transition disabled:opacity-50"
                            disabled={docActionLoading}
                            onClick={() => handleDocAction(doc.id, "verify")}
                          >
                            Verify
                          </button>
                          <button
                            className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium transition disabled:opacity-50"
                            disabled={docActionLoading}
                            onClick={() => handleDocAction(doc.id, "reject")}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {documentViewer.open &&
        documentViewer.document &&
        (() => {
          const doc = documentViewer.document;
          // Determine which bucket based on category
          const bucket =
            doc.category === "photo" || doc.category === "Photo" ? "dog-photos" : "dog-documents";
          const storageUrl = `https://qbwsozqajbfveeofxszw.supabase.co/storage/v1/object/public/${bucket}/${doc.storage_path}`;

          return (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-lg">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{doc.file_name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {doc.category} • {doc.content_type}
                    </p>
                  </div>
                  <button
                    onClick={() => setDocumentViewer({ open: false, document: null })}
                    className="text-slate-400 hover:text-slate-600 transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Modal Body - Document Display */}
                <div className="flex-1 overflow-auto p-6 bg-slate-50">
                  {doc.content_type.includes("pdf") ? (
                    <iframe
                      src={storageUrl}
                      className="w-full h-full border border-slate-200 rounded-lg"
                      title={doc.file_name}
                    />
                  ) : doc.content_type.includes("image") ? (
                    <div className="flex items-center justify-center h-full bg-white">
                      <img
                        src={storageUrl}
                        alt={doc.file_name}
                        className="max-w-full max-h-full rounded-lg shadow-md object-contain"
                        onError={(e) => {
                          console.error("Image failed to load:", e.target.src);
                          e.target.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' class='w-16 h-16 text-slate-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-8 h-8 text-slate-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-900 font-medium">{doc.file_name}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          Preview not available for this file type
                        </p>
                        <a
                          href={storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          Download File
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-white">
                  <div className="text-xs text-slate-500">
                    Size: {(doc.file_size_bytes / 1024).toFixed(1)} KB • Uploaded:{" "}
                    {new Date(doc.uploaded_at).toLocaleString()}
                  </div>
                  <button
                    onClick={() => setDocumentViewer({ open: false, document: null })}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
