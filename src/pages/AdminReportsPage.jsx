import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  User,
  Calendar,
  MessageSquare,
  FileText,
  Filter,
  ArrowLeft,
  Eye,
  Ban,
  Check,
  Loader2,
  Bell,
  MoreHorizontal,
  Mail,
  AlertCircle,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import supabase from "../lib/supabaseClient";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import { createNotification } from "../lib/notifications";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";

const STATUS_COLORS = {
  open: "destructive",
  under_review: "secondary",
  resolved: "default",
  rejected: "outline",
  appealed: "secondary",
};

const PRIORITY_COLORS = {
  low: "secondary",
  normal: "outline",
  high: "destructive",
  critical: "destructive",
};

const STATUS_LABELS = {
  open: "Open",
  under_review: "Under Review",
  resolved: "Resolved",
  rejected: "Rejected",
  appealed: "Appealed",
};

const TYPE_LABELS = {
  dog_profile: "Dog Profile",
  chat_message: "Chat Message",
  forum_thread: "Forum Thread",
};

const TYPE_ICONS = {
  dog_profile: <User className="h-4 w-4" />,
  chat_message: <MessageSquare className="h-4 w-4" />,
  forum_thread: <FileText className="h-4 w-4" />,
};

// Skeleton loading component
const ReportsSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Header Skeleton */}
    <div className="border-b">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>

    <div className="container mx-auto px-4 py-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <Skeleton className="h-4 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Skeleton */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
          </div>
        </CardContent>
      </Card>

      {/* Reports List Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [actionState, setActionState] = useState({ open: false, type: null, report: null });
  const [actionNotes, setActionNotes] = useState("");
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = React.useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const { data, error: queryError } = await supabase
        .from("reports")
        .select(
          `
          id,
          reporter_id,
          report_type,
          category,
          status,
          priority,
          reason,
          description,
          target_id,
          reported_at,
          created_at,
          updated_at,
          admin_notes,
          resolution,
          reviewed_by,
          reviewer:users!reports_reviewed_by_fkey(id, name, email),
          reporter:users!reports_reporter_id_fkey(id, name, email)
        `
        )
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      setReports(data || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
      setError(err.message || "Unable to load reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        report.reason?.toLowerCase().includes(term) ||
        report.category?.toLowerCase().includes(term) ||
        report.reporter?.email?.toLowerCase().includes(term) ||
        report.reporter?.name?.toLowerCase().includes(term) ||
        report.report_type?.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      const matchesType = typeFilter === "all" || report.report_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, searchTerm, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        acc.total += 1;
        acc.status[report.status] = (acc.status[report.status] || 0) + 1;
        acc.type[report.report_type] = (acc.type[report.report_type] || 0) + 1;
        return acc;
      },
      { total: 0, status: {}, type: {} }
    );
  }, [reports]);

  const openActionModal = (report, type) => {
    setActionState({ open: true, type, report });
    if (type === "resolve") {
      setActionNotes(report?.resolution || "");
    } else {
      setActionNotes("");
    }
    setActionError(null);
  };

  const closeActionModal = () => {
    setActionState({ open: false, type: null, report: null });
    setActionNotes("");
    setActionError(null);
    setActionLoading(false);
  };

  const notifyReporter = async (report, nextStatus, notes) => {
    if (!report?.reporter?.id) return;

    const title =
      nextStatus === "rejected"
        ? "Update on your report"
        : nextStatus === "resolved"
          ? "Your report has been resolved"
          : "Your report is being reviewed";

    const message = buildNotificationMessage(report, nextStatus, notes);

    await createNotification({
      userId: report.reporter.id,
      title,
      message,
      type: "report_update",
      relatedId: report.id,
    });
  };

  const handleReportAction = async () => {
    if (!actionState.report || !actionState.type) return;

    setActionError(null);
    setActionLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("Your admin session has expired.");

      const statusMap = {
        reject: "rejected",
        review: "under_review",
        resolve: "resolved",
      };

      const nextStatus = statusMap[actionState.type];
      if (!nextStatus) {
        throw new Error("Unsupported action");
      }

      const updatePayload = {
        status: nextStatus,
        admin_notes: actionNotes || null,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (nextStatus === "resolved") {
        updatePayload.resolution = actionNotes || actionState.report.resolution || "Resolved";
      } else if (actionState.report.resolution && nextStatus !== "resolved") {
        updatePayload.resolution = actionState.report.resolution;
      }

      const { error: updateError } = await supabase
        .from("reports")
        .update(updatePayload)
        .eq("id", actionState.report.id);

      if (updateError) throw updateError;

      // Insert reply into report_replies table
      const { error: replyError } = await supabase.from("report_replies").insert([
        {
          report_id: actionState.report.id,
          admin_id: session.user.id,
          user_id: actionState.report.reporter.id,
          reply_text: actionNotes,
          action_type: actionState.type,
          is_notified: false,
        },
      ]);
      if (replyError) throw replyError;

      await notifyReporter(actionState.report, nextStatus, actionNotes);

      const toastMessages = {
        rejected: "Report marked as rejected and reporter notified.",
        under_review: "Report moved to under review and reporter notified.",
        resolved: "Report marked as resolved and reporter notified.",
      };

      toast.success(toastMessages[nextStatus] || "Report updated.");
      closeActionModal();
      fetchReports();
    } catch (err) {
      console.error("Failed to update report:", err);
      setActionError(err.message || "Failed to update report status.");
      toast.error("Failed to update report status.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incident Reports</h1>
          <p className="text-muted-foreground">
            Monitor abuse, safety, and policy violations submitted by the community.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReports} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <Separator />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reports"
          value={summary.total}
          icon={<AlertTriangle className="h-4 w-4" />}
          description="All time"
        />
        <StatCard
          title="Open"
          value={summary.status.open || 0}
          icon={<Clock className="h-4 w-4" />}
          description="Pending review"
          variant="destructive"
        />
        <StatCard
          title="Under Review"
          value={summary.status.under_review || 0}
          icon={<Eye className="h-4 w-4" />}
          description="In progress"
          // ...existing code...

          // Helper to fetch report replies for notifications (should be outside any component/JSX)

          // Place this at the very end of the file, after all components and exports

          variant="warning"
        />
        <StatCard
          title="Resolved"
          value={summary.status.resolved || 0}
          icon={<CheckCircle className="h-4 w-4" />}
          description="Completed"
          variant="success"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Reports ({filteredReports.length})</span>
            {error && (
              <Badge variant="destructive" className="text-xs">
                Error loading reports
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "No reports have been submitted yet"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Reporter Avatar */}
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={report.reporter?.avatar_url} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>

                        {/* Report Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {TYPE_ICONS[report.report_type] || <FileText className="h-4 w-4" />}
                                <h3 className="font-medium truncate">{report.reason}</h3>
                                <Badge variant={STATUS_COLORS[report.status] || "outline"}>
                                  {report.status?.replace("_", " ")}
                                </Badge>
                                <Badge variant={PRIORITY_COLORS[report.priority] || "outline"}>
                                  {report.priority}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {report.reporter?.name || "Unknown"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {report.reporter?.email || "No email"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(
                                    new Date(report.reported_at || report.created_at),
                                    "MMM d, yyyy"
                                  )}
                                </span>
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {report.description}
                              </p>

                              <div className="text-xs text-muted-foreground">
                                {TYPE_LABELS[report.report_type] || report.report_type} •{" "}
                                {report.category} • ID: {report.id.slice(0, 8)}…
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openActionModal(report, "review")}
                            disabled={!["open", "appealed"].includes(report.status)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openActionModal(report, "reject")}
                            disabled={["rejected", "resolved"].includes(report.status)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openActionModal(report, "resolve")}
                            disabled={!["under_review", "open"].includes(report.status)}
                            className="text-green-600 hover:text-green-600"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog open={actionState.open} onOpenChange={closeActionModal}>
        <DialogContent className="sm:max-w-[500px] p-6">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  actionState.type === "reject"
                    ? "bg-red-100"
                    : actionState.type === "resolve"
                      ? "bg-green-100"
                      : "bg-blue-100"
                }`}
              >
                {actionState.type === "reject" && <Ban className="h-5 w-5 text-red-600" />}
                {actionState.type === "resolve" && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {actionState.type === "review" && <Eye className="h-5 w-5 text-blue-600" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {actionState.type === "reject" && "Reject Report"}
                  {actionState.type === "resolve" && "Resolve Report"}
                  {actionState.type === "review" && "Review Report"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Report #{actionState.report?.id?.slice(0, 8)}…
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Report Summary */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {TYPE_ICONS[actionState.report?.report_type] || <FileText className="h-4 w-4" />}
                  <span className="font-medium text-sm">{actionState.report?.reason}</span>
                  <Badge
                    variant={STATUS_COLORS[actionState.report?.status] || "outline"}
                    className="text-xs"
                  >
                    {actionState.report?.status?.replace("_", " ")}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {actionState.report?.category} • Reported by{" "}
                  {actionState.report?.reporter?.name || "Unknown"}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {actionState.report?.description}
                </div>
              </div>
            </div>

            {/* Action Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {actionState.type === "resolve" ? "Resolution Details" : "Admin Notes"}
                {actionState.type !== "review" && (
                  <span className="text-muted-foreground text-xs ml-1">
                    (will be sent to reporter)
                  </span>
                )}
              </Label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={
                  actionState.type === "reject"
                    ? "Provide a reason for rejection..."
                    : actionState.type === "resolve"
                      ? "Describe how this was resolved..."
                      : "Add internal notes for moderators..."
                }
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {actionNotes.length}/500 characters
              </p>
            </div>

            {/* Warning/Info Message */}
            <div
              className={`rounded-lg p-3 text-sm ${
                actionState.type === "reject"
                  ? "bg-amber-50 border border-amber-200 text-amber-800"
                  : "bg-blue-50 border border-blue-200 text-blue-800"
              }`}
            >
              <div className="flex items-start gap-2">
                {actionState.type === "reject" ? (
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <p className="text-xs leading-relaxed">
                  {actionState.type === "reject"
                    ? "The reporter will be notified of this decision. Please provide a clear and professional explanation."
                    : "The reporter will be notified of this action. Your notes will help them understand the outcome."}
                </p>
              </div>
            </div>

            {/* Error Display */}
            {actionError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{actionError}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <div className="flex gap-52">
              <Button
                variant="outline"
                onClick={closeActionModal}
                disabled={actionLoading}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReportAction}
                disabled={actionLoading}
                variant={
                  actionState.type === "reject"
                    ? "destructive"
                    : actionState.type === "resolve"
                      ? "default"
                      : "secondary"
                }
                className="min-w-[140px]"
              >
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {actionState.type === "reject" && "Reject Report"}
                {actionState.type === "resolve" && "Mark Resolved"}
                {actionState.type === "review" && "Start Review"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, icon, description, variant = "default" }) {
  const variantClasses = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-500",
    warning: "bg-amber-500/10 text-amber-500",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium">{title}</div>
        <div className={`p-2 rounded-full ${variantClasses[variant]}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function buildNotificationMessage(report, status, notes) {
  const typeLabel = TYPE_LABELS[report.report_type] || "content";

  if (status === "rejected") {
    return `Thanks for looking out for the community. After reviewing your ${typeLabel.toLowerCase()} report "${report.reason}", we were unable to confirm a policy violation. ${
      notes ? `Moderator notes: ${notes}` : ""
    }`;
  }

  if (status === "resolved") {
    return `Good news! We completed the review of your ${typeLabel.toLowerCase()} report "${report.reason}" and have taken the appropriate action. ${
      notes ? `Resolution details: ${notes}` : ""
    }`;
  }

  return `We received your ${typeLabel.toLowerCase()} report "${report.reason}" and it is now in the review queue. ${
    notes ? `Moderator notes: ${notes}` : ""
  }`;
}
