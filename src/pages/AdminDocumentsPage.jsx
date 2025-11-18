import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import AdminModal from "../components/AdminModal";
import ConfirmDialog from "../components/ConfirmDialog";

export default function AdminDocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all"); // all, health, vaccination, pedigree, other
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, docId: null });
  const [stats, setStats] = useState({
    total: 0,
    health: 0,
    vaccination: 0,
    pedigree: 0,
    other: 0,
  });

  useEffect(() => {
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    try {
      console.log("AdminDocumentsPage: Checking admin access...");
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

      console.log("Admin access confirmed, fetching documents");
      await fetchDocuments();
    } catch (err) {
      console.error("Admin access check failed:", err);
      navigate("/admin");
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("dog_documents")
        .select(
          `
          id,
          dog_id,
          user_id,
          file_name,
          storage_path,
          file_size_bytes,
          content_type,
          category,
          uploaded_at,
          dogs (
            name,
            breed,
            image_url
          ),
          users (
            name,
            email
          )
        `
        )
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        return;
      }

      console.log("Fetched documents:", data?.length || 0);
      setDocuments(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const health = data?.filter((d) => d.category === "health").length || 0;
      const vaccination = data?.filter((d) => d.category === "vaccination").length || 0;
      const pedigree = data?.filter((d) => d.category === "pedigree").length || 0;
      const other =
        data?.filter((d) => !["health", "vaccination", "pedigree"].includes(d.category)).length ||
        0;

      setStats({ total, health, vaccination, pedigree, other });
    } catch (err) {
      console.error("Error in fetchDocuments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action, docId) => {
    setConfirmDialog({
      open: true,
      action,
      docId,
    });
  };

  const confirmAction = async () => {
    const { action, docId } = confirmDialog;

    try {
      if (action === "delete") {
        // Get the document to delete from storage
        const doc = documents.find((d) => d.id === docId);

        if (doc?.storage_path) {
          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from("dog-documents")
            .remove([doc.storage_path]);

          if (storageError) {
            console.error("Error deleting from storage:", storageError);
          }
        }

        // Delete from database
        const { error } = await supabase.from("dog_documents").delete().eq("id", docId);

        if (error) throw error;
        console.log("Document deleted:", docId);
      }

      // Refresh the list
      await fetchDocuments();
      setConfirmDialog({ open: false, action: null, docId: null });
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      alert(`Failed to ${action} document. Please try again.`);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    // Search filter
    const matchesSearch =
      doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.dogs?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.dogs?.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.users?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Category filter
    if (filterCategory === "all") return true;
    if (filterCategory === "other") {
      return !["health", "vaccination", "pedigree"].includes(doc.category);
    }
    return doc.category === filterCategory;
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getCategoryBadge = (category) => {
    const badges = {
      health: { text: "Health", color: "bg-blue-100 text-blue-800" },
      vaccination: { text: "Vaccination", color: "bg-green-100 text-green-800" },
      pedigree: { text: "Pedigree", color: "bg-purple-100 text-purple-800" },
    };

    return badges[category] || { text: category || "Other", color: "bg-gray-100 text-gray-800" };
  };

  const viewDocument = async (doc) => {
    if (!doc.storage_path) {
      alert("Document path not available");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("dog-documents")
        .createSignedUrl(doc.storage_path, 60); // 60 seconds expiry

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (err) {
      console.error("Error viewing document:", err);
      alert("Failed to load document. Please try again.");
    }
  };

  if (loading) {
    return <AdminLoadingScreen message="Loading documents..." />;
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
              <h1 className="text-2xl font-bold text-slate-900">Document Management</h1>
              <p className="text-sm text-slate-600 mt-1">View and manage all dog documents</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-600">Total Documents</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-600">Health Records</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats.health}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-600">Vaccinations</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats.vaccination}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-600">Pedigrees</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{stats.pedigree}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-600">Other</div>
            <div className="text-3xl font-bold text-gray-600 mt-2">{stats.other}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by filename, dog name, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="health">Health Records</option>
                <option value="vaccination">Vaccinations</option>
                <option value="pedigree">Pedigrees</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Dog
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      <div className="text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-slate-400"
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
                        <h3 className="mt-2 text-sm font-medium text-slate-900">
                          No documents found
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {searchTerm || filterCategory !== "all"
                            ? "Try adjusting your search or filters"
                            : "No documents have been uploaded yet"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const categoryBadge = getCategoryBadge(doc.category);
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={doc.dogs?.image_url || "https://via.placeholder.com/150"}
                              alt={doc.dogs?.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-slate-900">
                                {doc.dogs?.name || "Unknown"}
                              </div>
                              <div className="text-sm text-slate-500">
                                {doc.dogs?.breed || "Unknown breed"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="text-sm text-slate-900 truncate max-w-xs"
                            title={doc.file_name}
                          >
                            {doc.file_name}
                          </div>
                          <div className="text-xs text-slate-500">{doc.content_type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoryBadge.color}`}
                          >
                            {categoryBadge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {doc.users?.name || "Unknown"}
                          </div>
                          <div className="text-sm text-slate-500">
                            {doc.users?.email || "No email"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {formatFileSize(doc.file_size_bytes)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => viewDocument(doc)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/dogs/${doc.dog_id}`)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Dog Profile
                          </button>
                          <button
                            onClick={() => handleActionClick("delete", doc.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null, docId: null })}
        onConfirm={confirmAction}
        title="Delete Document"
        message="Are you sure you want to delete this document? This will remove it from storage and the database. This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
      />
    </div>
  );
}
