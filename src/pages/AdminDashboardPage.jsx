import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  PawPrint,
  MessageSquare,
  AlertTriangle,
  Activity,
  Clock,
  UserPlus,
  Dog,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  AlertOctagon,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import supabase from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";

const POLL_MS = 30000;

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState(null);
  // Check if the current user is waiting for verification
  useEffect(() => {
    async function fetchVerificationStatus() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("users")
        .select("verification_status")
        .eq("id", user.id)
        .single();
      if (!error && data) {
        setVerificationStatus(data.verification_status);
      }
    }
    fetchVerificationStatus();
  }, [user]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDogs: 0,
    activeThreads: 0,
    pendingReports: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState({
    flaggedContent: 0,
    verificationRequests: 0,
    systemErrors: 0,
  });

  const getStats = async () => {
    const [
      { count: userCount, error: userErr },
      { count: dogCount, error: dogErr },
      { count: threadCount, error: threadErr },
      { count: pendingReportsCount, error: reportErr },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("dogs").select("*", { count: "exact", head: true }),
      supabase.from("threads").select("*", { count: "exact", head: true }),
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "under_review"]),
    ]);

    if (userErr || dogErr || threadErr || reportErr) {
      throw userErr || dogErr || threadErr || reportErr;
    }

    return {
      totalUsers: userCount || 0,
      totalDogs: dogCount || 0,
      activeThreads: threadCount || 0,
      pendingReports: pendingReportsCount || 0,
    };
  };

  const getRecentActivity = async () => {
    const [users, dogs, reports, contactMessages, dogMatches, forumPosts] = await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, created_at, avatar_url")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("dogs")
        .select("id, name, breed, created_at, profile_image_url, user_id")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("reports")
        .select("id, report_type, category, status, created_at, reported_by")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("contact_messages")
        .select("id, name, subject, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("dog_match_requests")
        .select(
          `
          id, 
          status, 
          requested_at, 
          accepted_at, 
          declined_at,
          requester_dog:requester_dog_id(name),
          requested_dog:requested_dog_id(name)
        `
        )
        .in("status", [
          "accepted",
          "declined",
          "awaiting_confirmation",
          "completed_success",
          "completed_failed",
        ])
        .order("requested_at", { ascending: false })
        .limit(10),
      supabase
        .from("threads")
        .select("id, title, image_url, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Fetch user names for forum posts separately
    let enrichedForumPosts = forumPosts.data || [];
    if (enrichedForumPosts.length > 0) {
      try {
        const userIds = [...new Set(enrichedForumPosts.map((p) => p.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: postUsers } = await supabase
            .from("users")
            .select("id, name")
            .in("id", userIds);

          const userMap = Object.fromEntries((postUsers || []).map((u) => [u.id, u]));
          enrichedForumPosts = enrichedForumPosts.map((post) => ({
            ...post,
            author: userMap[post.user_id] || null,
          }));
        }
      } catch (err) {
        console.error("Error fetching forum post authors:", err);
      }
    }

    const activities = [
      ...(users.data || []).map((user) => ({
        id: `user-${user.id}`,
        type: "user",
        title: user.name || user.email || "New account",
        subtitle: "New account created",
        details: user.email || "No email",
        avatar_url: user.avatar_url,
        timestamp: user.created_at,
      })),
      ...(dogs.data || []).map((dog) => ({
        id: `dog-${dog.id}`,
        type: "dog",
        title: dog.name || "Unnamed dog",
        subtitle: `New dog profile${dog.breed ? ` • ${dog.breed}` : ""}`,
        details: `Owner: ${dog.user_id || "Unknown"}`,
        profile_image_url: dog.profile_image_url,
        timestamp: dog.created_at,
      })),
      ...(reports.data || []).map((report) => ({
        id: `report-${report.id}`,
        type: "report",
        title: `${report.report_type.replace("_", " ")} report`,
        subtitle: `Category: ${report.category}`,
        details: `Status: ${report.status}`,
        reported_by: report.reported_by,
        timestamp: report.created_at,
      })),
      ...(contactMessages.data || []).map((message) => ({
        id: `contact-${message.id}`,
        type: "contact",
        title: `Contact: ${message.name}`,
        subtitle: message.subject || "No subject",
        details: `Status: ${message.status}`,
        timestamp: message.created_at,
      })),
      ...(dogMatches.data || []).map((match) => ({
        id: `match-${match.id}`,
        type: "match",
        title: `${match.requester_dog?.name || "Dog"} ↔ ${match.requested_dog?.name || "Dog"}`,
        subtitle: `Match ${match.status.replace("_", " ")}`,
        details:
          match.status === "accepted" || match.status === "awaiting_confirmation"
            ? "Breeding agreed"
            : match.status === "declined"
              ? "Breeding declined"
              : `Status: ${match.status.replace("_", " ")}`,
        timestamp: match.accepted_at || match.declined_at || match.requested_at,
      })),
      ...enrichedForumPosts.map((post) => {
        const userName = post.author?.name || "Unknown User";
        const postTitle = post.title || (post.image_url ? "New Photo Post" : "Untitled");
        return {
          id: `post-${post.id}`,
          type: "post",
          title: "New Forum Post",
          subtitle: userName,
          details: postTitle,
          timestamp: post.created_at,
        };
      }),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 15);

    return activities;
  };

  const getAlerts = async () => {
    const [{ count: flaggedContent }, { count: newUsers }, { count: contactMessages }] =
      await Promise.all([
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }),
      ]);

    return {
      flaggedContent: flaggedContent || 0,
      newUsers: newUsers || 0,
      contactMessages: contactMessages || 0,
    };
  };

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [statsData, activityData, alertsData] = await Promise.all([
        getStats(),
        getRecentActivity(),
        getAlerts(),
      ]);

      setStats(statsData);
      setRecentActivity(activityData);
      setAlerts(alertsData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, POLL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = () => {
    loadData();
  };

  const renderActivityItem = (item) => {
    return (
      <div key={item.id} className="py-2 px-1 hover:bg-accent/50 rounded-lg transition-colors">
        <div className="flex items-start space-x-3">
          {/* Avatar/Icon */}
          {item.type === "user" ? (
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={item.avatar_url} alt={item.title} />
              <AvatarFallback>{item.title?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
          ) : item.type === "dog" ? (
            <div className="h-9 w-9 shrink-0 rounded-full bg-secondary flex items-center justify-center">
              <PawPrint className="h-4 w-4" />
            </div>
          ) : item.type === "report" ? (
            <div className="h-9 w-9 shrink-0 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          ) : item.type === "contact" ? (
            <div className="h-9 w-9 shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
          ) : item.type === "match" ? (
            <div className="h-9 w-9 shrink-0 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              <Dog className="h-4 w-4" />
            </div>
          ) : item.type === "post" ? (
            <div className="h-9 w-9 shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
          ) : null}
          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {formatTimeAgo(item.timestamp)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.details}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your platform's activity</p>
          </div>
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading...
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verification Banner */}
      {verificationStatus === "pending" && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded">
          <strong>Account Verification:</strong> Your account is currently waiting for verification.
          Some features may be restricted until verification is complete.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your platform's activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
          description="+20.1% from last month"
        />
        <StatCard
          title="Dogs Registered"
          value={stats.totalDogs.toLocaleString()}
          icon={<PawPrint className="h-4 w-4" />}
          description="+12.3% from last month"
          variant="success"
        />
        <StatCard
          title="Active Threads"
          value={stats.activeThreads.toLocaleString()}
          icon={<MessageSquare className="h-4 w-4" />}
          description="+5.2% from last month"
          variant="warning"
        />
        <StatCard
          title="Pending Reports"
          value={stats.pendingReports.toLocaleString()}
          icon={<AlertTriangle className="h-4 w-4" />}
          description={
            stats.pendingReports > 0 ? `${stats.pendingReports} need attention` : "All clear!"
          }
          variant={stats.pendingReports > 0 ? "destructive" : "default"}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {recentActivity.length > 0 ? (
                  recentActivity.map(renderActivityItem)
                ) : (
                  <div className="flex flex-col items-center justify-center h-[250px] text-center">
                    <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Alerts & Notifications</CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AlertItem
                icon={<AlertCircle className="h-4 w-4" />}
                title={`${alerts.flaggedContent} Flagged Items`}
                description="Content reported by users"
                action={() => navigate("/admin/reports")}
                variant={alerts.flaggedContent > 0 ? "destructive" : "default"}
              />
              <AlertItem
                icon={<UserPlus className="h-4 w-4" />}
                title={`${alerts.newUsers} New Users`}
                description="Users registered in the last 24 hours"
                action={() => navigate("/admin/users")}
                variant={alerts.newUsers > 0 ? "warning" : "default"}
              />
              <AlertItem
                icon={<MessageSquare className="h-4 w-4" />}
                title={`Contact Messages`}
                description={`Total messages: ${alerts.contactMessages}`}
                action={() => navigate("/admin/messages")}
                variant={alerts.contactMessages > 0 ? "warning" : "default"}
              />
            </div>
          </CardContent>
        </Card>
      </div>
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

function AlertItem({ icon, title, description, action, variant = "default" }) {
  const variantClasses = {
    default: "border",
    destructive: "border-destructive/20 bg-destructive/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    error: "border-red-500/20 bg-red-500/5",
  };

  const textClasses = {
    default: "text-foreground",
    destructive: "text-destructive",
    warning: "text-amber-500",
    error: "text-red-500",
  };

  return (
    <div
      className={`flex items-start p-4 rounded-lg ${variantClasses[variant]} transition-colors hover:bg-accent/50 cursor-pointer`}
      onClick={action}
    >
      <div
        className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${variantClasses[variant]}`}
      >
        {icon}
      </div>
      <div className="ml-4 flex-1">
        <p className={`text-sm font-medium ${textClasses[variant]}`}>{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground ml-2 mt-1" />
    </div>
  );
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} ${interval === 1 ? "year" : "years"} ago`;

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} ${interval === 1 ? "month" : "months"} ago`;

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} ${interval === 1 ? "day" : "days"} ago`;

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} ${interval === 1 ? "hour" : "hours"} ago`;

  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} ${interval === 1 ? "minute" : "minutes"} ago`;

  return "just now";
}
