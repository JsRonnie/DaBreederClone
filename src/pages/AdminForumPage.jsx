import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Trash2,
  Eye,
  MessageSquare,
  Users,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import supabase from "../lib/supabaseClient";
import ConfirmDialog from "../components/ConfirmDialog";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";

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
      const { data: threadUsers = [] } =
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
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
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
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium z-40 flex items-center gap-2 ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Forum Management</h1>
          </div>
          <p className="text-muted-foreground">
            View all posts and comments, delete inappropriate content
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchForumData}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      <Separator />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalThreads}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalThreads === 1 ? "1 post" : `${stats.totalThreads} posts`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalComments === 1 ? "1 comment" : `${stats.totalComments} comments`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex-1">
              <Input
                placeholder="Search posts, comments, or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Tabs value={view} onValueChange={setView} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="threads" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Posts ({filteredThreads.length})
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Comments ({filteredComments.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Tabs value={view} onValueChange={setView}>
        <TabsContent value="threads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {paginatedThreads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No posts found</div>
                  ) : (
                    paginatedThreads.map((thread) => (
                      <div
                        key={thread.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={thread.users?.avatar_url} />
                              <AvatarFallback>
                                {thread.users?.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold">{thread.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                by {thread.users?.name || "Unknown"} •{" "}
                                {formatDistanceToNow(new Date(thread.created_at), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {thread.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant={
                                thread.users?.is_active === false ? "destructive" : "secondary"
                              }
                            >
                              {thread.users?.is_active === false ? "Banned" : "Active"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {thread.users?.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => viewThread(thread.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteClick(
                                "deleteThread",
                                thread.id,
                                thread.title,
                                thread.users?.id,
                                thread.users?.name
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {thread.users?.is_active !== false && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteClick(
                                  "banUser",
                                  thread.id,
                                  thread.title,
                                  thread.users?.id,
                                  thread.users?.name
                                )
                              }
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Pagination for Threads */}
          {totalPagesThreads > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                {Math.min(currentPage * rowsPerPage, filteredThreads.length)} of{" "}
                {filteredThreads.length} posts
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPagesThreads}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPagesThreads, prev + 1))}
                  disabled={currentPage === totalPagesThreads}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPagesThreads)}
                  disabled={currentPage === totalPagesThreads}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {paginatedComments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No comments found</div>
                  ) : (
                    paginatedComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={comment.users?.avatar_url} />
                              <AvatarFallback>
                                {comment.users?.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                by {comment.users?.name || "Unknown"} •{" "}
                                {formatDistanceToNow(new Date(comment.created_at), {
                                  addSuffix: true,
                                })}
                              </p>
                              <p className="text-sm font-medium text-blue-600">
                                Re: {comment.threads?.title}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {comment.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant={
                                comment.users?.is_active === false ? "destructive" : "secondary"
                              }
                            >
                              {comment.users?.is_active === false ? "Banned" : "Active"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {comment.users?.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewThread(comment.thread_id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteClick(
                                "deleteComment",
                                comment.id,
                                "",
                                comment.users?.id,
                                comment.users?.name
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {comment.users?.is_active !== false && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteClick(
                                  "banUser",
                                  comment.id,
                                  "",
                                  comment.users?.id,
                                  comment.users?.name
                                )
                              }
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Pagination for Comments */}
          {totalPagesComments > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                {Math.min(currentPage * rowsPerPage, filteredComments.length)} of{" "}
                {filteredComments.length} comments
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPagesComments}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPagesComments, prev + 1))}
                  disabled={currentPage === totalPagesComments}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPagesComments)}
                  disabled={currentPage === totalPagesComments}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmAction}
        title={
          confirmDialog.action === "deleteThread"
            ? "Delete Post"
            : confirmDialog.action === "deleteComment"
              ? "Delete Comment"
              : "Ban User"
        }
        message={
          confirmDialog.action === "deleteThread"
            ? `Are you sure you want to delete the post "${confirmDialog.itemTitle}"? This will also delete all comments.`
            : confirmDialog.action === "deleteComment"
              ? `Are you sure you want to delete this comment?`
              : `Are you sure you want to ban ${confirmDialog.userName}? This will prevent them from posting.`
        }
        confirmText={
          confirmDialog.action === "deleteThread"
            ? "Delete Post"
            : confirmDialog.action === "deleteComment"
              ? "Delete Comment"
              : "Ban User"
        }
        cancelText="Cancel"
        variant={confirmDialog.action === "banUser" ? "destructive" : "default"}
      />
    </div>
  );
}
