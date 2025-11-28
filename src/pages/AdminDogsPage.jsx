import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Trash2,
  Eye,
  FileText,
  Plus,
  Download,
  Check,
  X as XIcon,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  MoreHorizontal,
  User,
  PawPrint as PawPrintIcon,
  ArrowLeft,
  FileCheck,
  FileX,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import supabase from "../lib/supabaseClient";
import ConfirmDialog from "../components/ConfirmDialog";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
// import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table"; // Removed: file does not exist
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip"; // Removed: file does not exist
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { formatDistanceToNow } from "date-fns";

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

  // Helper to count documents for a dog
  const getDocumentCount = (dog) => {
    return Array.isArray(dog.dog_documents) ? dog.dog_documents.length : 0;
  };

  // Removed unused notification state
  const [documentViewer, setDocumentViewer] = useState({ open: false, document: null }); // { open, document }

  // Stub fetchDogs to prevent reference error
  const fetchDogs = async () => {
    setLoading(true);
    try {
      // Fetch dogs with owner and documents
      const { data, error } = await supabase
        .from("dogs")
        .select(`*, users(id, name, email), dog_documents(*)`);
      if (error) throw error;
      setDogs(data || []);
      // Calculate stats
      const total = data ? data.length : 0;
      const withDocs = data
        ? data.filter((dog) => dog.dog_documents && dog.dog_documents.length > 0).length
        : 0;
      setStats({ total, withDocs });
    } catch (err) {
      console.error("Failed to fetch dogs:", err);
      setDogs([]);
      setStats({ total: 0, withDocs: 0 });
    }
    setLoading(false);
  };

  // Stub handleActionClick to prevent reference error
  const handleActionClick = (action, dogId, dogName) => {
    // TODO: Implement actual action logic
    if (action === "delete") {
      setConfirmDialog({ open: true, action, dogId, dogName });
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8; // Match the users page for consistency

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

  // Removed stray <table> block outside the component
  // Removed orphaned closing braces from previous patch

  const confirmAction = async () => {
    const { action, dogId } = confirmDialog;

    try {
      if (action === "delete") {
        const { error } = await supabase.from("dogs").delete().eq("id", dogId);
        if (error) throw error;
        console.log("Dog deleted:", dogId);
        // Notification removed
      }
      // Refresh the list
      await fetchDogs();
      setConfirmDialog({ open: false, action: null, dogId: null, dogName: "" });
      // Notification removed
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      // Notification removed
    }
  };

  // Fetch documents for a dog and open modal
  const openDocModal = async (dog) => {
    setDocModal({ open: true, dog, documents: [], loading: true });
    try {
      // Always fetch latest documents from DB for this dog
      const { data: documents, error } = await supabase
        .from("dog_documents")
        .select("*")
        .eq("dog_id", dog.id);
      if (error) throw error;
      setDocModal({ open: true, dog, documents: documents || [], loading: false });
    } catch (err) {
      console.error("Failed to fetch documents for dog:", err);
      setDocModal({ open: true, dog, documents: [], loading: false });
    }
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

  // Calculate range for pagination display
  const startItem = (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, filteredDogs.length);

  const viewDocuments = (dog) => {
    // Always fetch latest documents for this dog
    openDocModal(dog);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dog Management</h1>
          <p className="text-muted-foreground">Monitor and manage all dog profiles and documents</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDogs} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      <Separator />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dogs</CardTitle>
            <PawPrintIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total === 1 ? "1 dog registered" : `${stats.total} dogs registered`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withDocs}</div>
            <p className="text-xs text-muted-foreground">
              {stats.withDocs === 1
                ? "1 dog with documents"
                : `${stats.withDocs} dogs with documents`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex-1">
              <Input
                placeholder="Search by name, breed, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterDocuments} onValueChange={setFilterDocuments}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by documents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dogs</SelectItem>
                <SelectItem value="verified">With Documents</SelectItem>
                <SelectItem value="pending">Pending Documents</SelectItem>
                <SelectItem value="none">No Documents</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dogs Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Dog Profiles</CardTitle>
          <CardDescription>Manage and review all registered dog profiles</CardDescription>
        </CardHeader>
        <div className="relative">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="w-[300px] px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Dog
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Health Tests
                  </th>
                  <th className="w-[120px] px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="w-[120px] px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="w-[100px] px-4 sm:px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mb-2 text-muted-foreground/30" />
                        <p className="text-sm font-medium">No dogs found</p>
                        <p className="text-xs">
                          {searchTerm || filterDocuments !== "all"
                            ? "Try adjusting your search or filters"
                            : "No dogs have been registered yet"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDogs.map((dog) => {
                    const createdAt = new Date(dog.created_at);
                    const formattedDate = format(createdAt, "MMM d, yyyy");
                    const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
                    return (
                      <tr key={dog.id} className="group hover:bg-muted/50">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                              <AvatarImage
                                src={dog.image_url || "/default-dog.png"}
                                alt={dog.name}
                              />
                              <AvatarFallback className="bg-muted">
                                <PawPrintIcon className="h-5 w-5 text-muted-foreground" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{dog.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {dog.breed} • {dog.age_years}y • {dog.gender}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{dog.users?.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              {dog.users?.email || "No email"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {dog.vaccinated && <Badge variant="success">Vaccinated</Badge>}
                            {dog.dna_tested && <Badge variant="outline">DNA Tested</Badge>}
                            {dog.pedigree_certified && <Badge variant="outline">Pedigree</Badge>}
                            {dog.heart_tested && <Badge variant="secondary">Heart</Badge>}
                            {dog.hip_elbow_tested && <Badge variant="outline">Hip/Elbow</Badge>}
                            {dog.eye_tested && <Badge variant="outline">Eyes</Badge>}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <Badge
                            variant={getDocumentCount(dog) > 0 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {getDocumentCount(dog) > 0 ? (
                              <>
                                <FileCheck className="mr-1 h-3 w-3" />
                                {getDocumentCount(dog)}{" "}
                                {getDocumentCount(dog) === 1 ? "doc" : "docs"}
                              </>
                            ) : (
                              <span className="text-muted-foreground">No docs</span>
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm">{formattedDate}</span>
                            <span className="text-xs text-muted-foreground">{timeAgo}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => viewDocuments(dog)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View documents</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleActionClick("delete", dog.id, dog.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{startItem}</span> to{" "}
                <span className="font-medium">{endItem}</span> of{" "}
                <span className="font-medium">{filteredDogs.length}</span> dogs
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}
        title={`Delete ${confirmDialog.dogName}?`}
        description="This action cannot be undone. This will permanently delete the dog's profile and all associated data."
        onConfirm={confirmAction}
        confirmText="Delete"
        variant="destructive"
      />

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
                      ) : null}
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
          // Determine bucket based on category (default: dog-documents)
          let bucket = "dog-documents";
          if (doc.category && doc.category.toLowerCase() === "photo") {
            bucket = "dog-photos";
          }
          // Use storage_path, fallback to file_path or path
          const path = doc.storage_path || doc.file_path || doc.path || doc.id;
          const storageUrl = path
            ? `https://qbwsozqajbfveeofxszw.supabase.co/storage/v1/object/public/${bucket}/${path}`
            : "";

          // Debug output for troubleshooting
          console.log("[Document Viewer] doc:", doc);
          console.log("[Document Viewer] storageUrl:", storageUrl);

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
                  {doc.content_type && doc.content_type.includes("pdf") && storageUrl ? (
                    <iframe
                      src={storageUrl}
                      className="w-full h-full border border-slate-200 rounded-lg"
                      title={doc.file_name}
                    />
                  ) : doc.content_type && doc.content_type.includes("image") && storageUrl ? (
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
                        {storageUrl && (
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
                        )}
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
