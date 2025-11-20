import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  Ban,
  Trash2,
  ShieldAlert,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import ErrorMessage from "../components/ErrorMessage";
import supabase from "../lib/supabaseClient";
import { sendBanNotificationEmail } from "../lib/banNotification";
import { useAdminData } from "../hooks/useAdminData";
import { fetchAdminUsers } from "../lib/api/admin";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState("");
  const [banReason, setBanReason] = useState("");
  const [showBanReasonModal, setShowBanReasonModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkAdminAccess() {
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
        if (!cancelled) setAuthorized(true);
      } catch (err) {
        console.error("Failed to verify admin session:", err);
        if (!cancelled) navigate("/admin");
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    }
    checkAdminAccess();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const {
    rows: users = [],
    total = 0,
    stats,
    pageCount,
    pagination,
    filters,
    search,
    loading: dataLoading,
    isFetching,
    error: fetchError,
    handleSearch,
    handleFilterChange,
    handlePageChange,
    refresh,
  } = useAdminData({
    queryKey: "admin-users",
    fetcher: fetchAdminUsers,
    initialFilters: { status: "all", search: "" },
    initialPageSize: 8,
    enabled: authorized,
    staleTime: 120_000,
  });

  const isLoading = authChecking || dataLoading;
  const currentPage = pagination.page;
  const pageSize = pagination.pageSize;
  const displayRangeStart = total ? (currentPage - 1) * pageSize + 1 : 0;
  const displayRangeEnd = total ? Math.min(displayRangeStart + users.length - 1, total) : 0;
  const refreshing = isFetching && !dataLoading;

  const summary = useMemo(() => {
    const totalUsers = total || 0;
    const activeCount = stats?.active ?? 0;
    const inactiveCount = stats?.inactive ?? 0;
    const adminCount = stats?.admins ?? 0;
    const activePct = totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 0;
    return {
      totalUsers,
      activeCount,
      inactiveCount,
      adminCount,
      activePct,
    };
  }, [stats, total]);

  const handleActionClick = (user, action) => {
    setSelectedUser(user);
    const finalAction = action === "deactivate" ? "ban" : action;
    setActionType(finalAction);
    if (finalAction === "ban") {
      setShowBanReasonModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const confirmAction = async () => {
    if (!selectedUser) return;
    try {
      setIsProcessing(true);
      if (actionType === "ban") {
        await supabase
          .from("users")
          .update({
            is_active: false,
            banned_at: new Date().toISOString(),
            ban_reason: banReason || "Terms of Service violation",
          })
          .eq("id", selectedUser.id);
        await sendBanNotificationEmail(
          selectedUser.email,
          selectedUser.name,
          banReason || "Terms of Service violation"
        );
        toast.success(`User ${selectedUser.email} has been banned. Notification sent.`);
      } else if (actionType === "reactivate") {
        await supabase
          .from("users")
          .update({
            is_active: true,
            banned_at: null,
            ban_reason: null,
          })
          .eq("id", selectedUser.id);
        toast.success(`User ${selectedUser.email} has been unbanned.`);
      } else if (actionType === "delete") {
        await supabase.from("users").delete().eq("id", selectedUser.id);
        toast.success(`User ${selectedUser.email} has been deleted.`);
      }
      await refresh();
      setShowConfirmModal(false);
      setShowBanReasonModal(false);
      setSelectedUser(null);
      setActionType("");
      setBanReason("");
    } catch (err) {
      toast.error("Failed to perform action. Please try again.");
      console.error("Action failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
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
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage all user accounts and permissions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      <Separator />
      {fetchError && <ErrorMessage message={fetchError} onRetry={refresh} />}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={summary.totalUsers.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
          description={`${summary.activeCount.toLocaleString()} active`}
        />
        <StatCard
          title="Active Users"
          value={summary.activeCount.toLocaleString()}
          icon={<UserCheck className="h-4 w-4" />}
          variant="success"
          description={`${summary.activePct || 0}% of total`}
        />
        <StatCard
          title="Banned Users"
          value={summary.inactiveCount.toLocaleString()}
          icon={<Ban className="h-4 w-4" />}
          variant={summary.inactiveCount > 0 ? "destructive" : "default"}
          description={summary.inactiveCount > 0 ? "Needs review" : "All clear"}
        />
        <StatCard
          title="Admin Users"
          value={summary.adminCount.toLocaleString()}
          icon={<ShieldAlert className="h-4 w-4" />}
          variant="warning"
          description="With elevated permissions"
        />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>Manage all user accounts and their permissions</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-9 w-full md:w-[200px] lg:w-[300px]"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => handleFilterChange({ status: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4 opacity-50" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deactivated">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Joined
                  </th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mb-2 opacity-30" />
                        <p className="text-lg font-medium">No users found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={user.avatar_url ? user.avatar_url : "/default-user.png"}
                              alt={user.name || user.email || "User"}
                            />
                            <AvatarFallback>
                              {(user.name
                                ? user.name[0]
                                : user.email
                                  ? user.email[0]
                                  : "U"
                              ).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{user.name || "No Name"}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={user.role === "admin" ? "default" : "outline"}
                          className={
                            user.role === "admin"
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : ""
                          }
                        >
                          {user.role || "user"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={user.is_active === false ? "destructive" : "success"}
                          className="capitalize"
                        >
                          {user.is_active === false ? "Banned" : "Active"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {user.role !== "admin" ? (
                            <>
                              {user.is_active === false ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleActionClick(user, "reactivate")}
                                  className="h-8 gap-1 text-xs"
                                >
                                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                                  Unban
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleActionClick(user, "ban")}
                                  className="h-8 gap-1 text-xs"
                                >
                                  <Ban className="h-3.5 w-3.5 mr-1" />
                                  Ban
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActionClick(user, "delete")}
                                className="h-8 gap-1 text-xs text-destructive hover:text-destructive/90 border-destructive/20 hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Delete
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground flex items-center">
                              Admin <ShieldAlert className="h-3.5 w-3.5 ml-1" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{displayRangeStart}</span> to{" "}
                <span className="font-medium">{displayRangeEnd}</span> of{" "}
                <span className="font-medium">{total}</span> users
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Ban Reason Dialog */}
      <AlertDialog open={showBanReasonModal} onOpenChange={setShowBanReasonModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>Ban User</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-4">
              <p className="mb-4">
                Please provide a reason for banning{" "}
                <span className="font-medium">{selectedUser?.email}</span>. This will be sent to the
                user in a notification email.
              </p>
              <Textarea
                placeholder="E.g., Harassment, Spam, Terms of Service violation..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="min-h-[120px]"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowBanReasonModal(false);
                setShowConfirmModal(true);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Continue with Ban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {actionType === "delete" && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <AlertDialogTitle>Delete User Account</AlertDialogTitle>
              </div>
            )}
            {actionType === "ban" && (
              <div className="flex items-center gap-2 text-destructive">
                <Ban className="h-5 w-5" />
                <AlertDialogTitle>Ban User Account</AlertDialogTitle>
              </div>
            )}
            {actionType === "reactivate" && (
              <div className="flex items-center gap-2 text-green-600">
                <UserCheck className="h-5 w-5" />
                <AlertDialogTitle>Unban User Account</AlertDialogTitle>
              </div>
            )}
            <AlertDialogDescription className="pt-4">
              <p className="mb-2">
                {actionType === "ban" && `Are you sure you want to ban ${selectedUser?.email}?`}
                {actionType === "delete" &&
                  `Are you sure you want to delete ${selectedUser?.email}'s profile?`}
                {actionType === "reactivate" &&
                  `Are you sure you want to unban ${selectedUser?.email}?`}
              </p>
              <p className="text-sm text-muted-foreground">
                {actionType === "ban" && "This will prevent the user from accessing their account."}
                {actionType === "delete" &&
                  "This action cannot be undone and will permanently remove all user data."}
                {actionType === "reactivate" &&
                  "The user will be able to access their account again."}
              </p>
              {actionType === "ban" && banReason && (
                <div className="mt-4 p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium mb-1">Ban Reason:</p>
                  <p className="text-sm">{banReason}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={isProcessing}
              className={actionType === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "ban"
                    ? "Ban User"
                    : actionType === "delete"
                      ? "Delete User"
                      : "Unban User"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// StatCard component for the stats grid
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
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center ${variantClasses[variant]}`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
