import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Mail,
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Reply,
  Check,
  X,
  MoreHorizontal,
  Eye,
  Send,
  User,
  FileText,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import supabase from "../lib/supabaseClient";

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Separator } from "../components/ui/separator";
import { Label } from "../components/ui/label";

// Utility function to format dates
const formatDate = (dateString) => {
  return format(new Date(dateString), "MMM d, yyyy");
};

// Utility function to calculate time ago
const getTimeAgo = (dateString) => {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};

// Status badge component
const StatusBadge = ({ status }) => {
  if (status === "resolved") {
    return (
      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Resolved
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
      <Clock className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  );
};

// Constants
const ROWS_PER_PAGE = 10;

// Utility Components
const LoadingSkeleton = ({ rows = 5, className = "" }) => (
  <div className={`space-y-4 ${className}`}>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

// Date cell component
const DateCell = ({ date }) => (
  <div className="flex flex-col">
    <span className="text-sm">{formatDate(date)}</span>
    <span className="text-xs text-muted-foreground">{getTimeAgo(date)}</span>
  </div>
);

const Pagination = ({ currentPage, totalPages, onPageChange, className = "" }) => {
  // Calculate range for pagination display
  const startItem = (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ROWS_PER_PAGE, totalPages * ROWS_PER_PAGE);

  return (
    <div className={`flex items-center justify-between px-6 py-4 border-t ${className}`}>
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{startItem}</span> to{" "}
        <span className="font-medium">{endItem}</span> of{" "}
        <span className="font-medium">{totalPages * ROWS_PER_PAGE}</span> messages
      </p>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default function AdminMessagesPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
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
      const { data, error } = await supabase
        .from("contact_messages")
        .update({ status: "resolved" })
        .eq("id", messageId)
        .select();

      if (error) throw error;

      console.log("Message marked as resolved:", messageId, data);

      // Only refetch from DB to ensure sync
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

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      const matchesSearch =
        message.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.message?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || message.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [messages, searchTerm, filterStatus]);

  const handleStatusToggle = useCallback(async (messageId, currentStatus) => {
    try {
      const newStatus = currentStatus === "pending" ? "resolved" : "pending";
      const { error } = await supabase
        .from("contact_messages")
        .update({ status: newStatus })
        .eq("id", messageId);

      if (error) throw error;

      // Always refetch from DB for accuracy
      await fetchMessages();

      toast.success(`Message marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating message status:", error);
      toast.error("Failed to update message status");
    }
  }, []);

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / ROWS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredMessages.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contact Messages</h1>
            <p className="text-muted-foreground">View and manage all contact form submissions</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMessages}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <Separator />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total === 1 ? "1 message" : `${stats.total} messages`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pending === 1 ? "1 pending message" : `${stats.pending} pending messages`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">
                {stats.resolved === 1
                  ? "1 resolved message"
                  : `${stats.resolved} resolved messages`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, subject, or message..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Messages</SelectItem>
                    <SelectItem value="pending">Pending Only</SelectItem>
                    <SelectItem value="resolved">Resolved Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages Table */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Messages</CardTitle>
                <CardDescription>
                  {filteredMessages.length === 0
                    ? "No messages found"
                    : `Showing ${filteredMessages.length} ${filteredMessages.length === 1 ? "message" : "messages"}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="relative">
            {loading ? (
              <div className="p-6">
                <LoadingSkeleton rows={8} />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No messages found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm
                    ? "Try adjusting your search or filters"
                    : "No messages have been received yet"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="w-[250px] px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Contact Info
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="w-[120px] px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="w-[150px] px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="w-[120px] px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedMessages.map((message) => (
                      <tr key={message.id} className="hover:bg-muted/50">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {message.name ? message.name.charAt(0).toUpperCase() : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-3">
                              <div className="font-medium text-foreground">
                                {message.name || "Anonymous"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {message.email || "No email"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="font-medium text-foreground">
                            {message.subject || "No subject"}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {message.message || "No message content"}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <StatusBadge status={message.status} />
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <DateCell date={message.created_at} />
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <div className="flex justify-end space-x-1">
                            {/* View Button - icon only, no label/tooltip */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedMessage(message)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Status Toggle Button - icon only, no label/tooltip */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (message.status === "pending") {
                                  markAsResolved(message.id);
                                } else {
                                  handleStatusToggle(message.id, message.status);
                                }
                              }}
                              className={`h-8 w-8 ${
                                message.status === "pending"
                                  ? "text-green-600 hover:bg-green-50"
                                  : "text-amber-600 hover:bg-amber-50"
                              }`}
                            >
                              {message.status === "pending" ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Clock className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="border-t"
              />
            )}
          </div>
        </Card>
      </div>

      {/* Message Detail Modal */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="sm:max-w-[600px] p-6">
          {selectedMessage && (
            <>
              <DialogHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold">Contact Message</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      From {selectedMessage.name} on {formatDate(selectedMessage.created_at)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedMessage.status} />
                </div>

                {/* Message Summary */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        {selectedMessage.subject || "No subject"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedMessage.name} ({selectedMessage.email || "No email provided"})
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {selectedMessage.message}
                    </div>
                  </div>
                </div>

                {/* Previous Reply */}
                {selectedMessage.admin_reply && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Previous Reply</Label>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedMessage.admin_reply}
                      </p>
                      {selectedMessage.replied_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Replied {getTimeAgo(selectedMessage.replied_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Reply Form */}
                {selectedMessage.status === "pending" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Reply Message</Label>
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..."
                      className="min-h-[100px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {replyText.length}/500 characters
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                        <p className="text-xs text-blue-800 leading-relaxed">
                          This reply will be sent to {selectedMessage.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedMessage(null)}
                    className="min-w-[100px]"
                  >
                    Close
                  </Button>
                  {selectedMessage.status === "pending" ? (
                    <Button
                      onClick={sendReply}
                      disabled={sending || !replyText.trim()}
                      className="min-w-[140px]"
                    >
                      {sending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => markAsPending(selectedMessage.id)}
                      variant="outline"
                      className="min-w-[140px]"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Reopen
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
