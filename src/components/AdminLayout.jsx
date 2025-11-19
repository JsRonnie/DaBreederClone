import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from "./ui/sidebar";
import {
  LayoutDashboard,
  Users,
  PawPrint,
  MessageSquare,
  AlertCircle,
  Menu,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";
import supabase from "../lib/supabaseClient";

const navItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/dogs", label: "Dogs", icon: PawPrint },
  { path: "/admin/forum", label: "Forum", icon: MessageSquare },
  { path: "/admin/messages", label: "Messages", icon: MessageSquare },
  { path: "/admin/reports", label: "Reports", icon: AlertCircle },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const currentNavItem = navItems.find((item) => location.pathname.startsWith(item.path)) || {};

  // Close the drawer when navigating to a new admin route
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Load admin identity once so the sidebar can display details
  useEffect(() => {
    let active = true;
    const loadAdmin = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (!session) {
          navigate("/admin", { replace: true });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("name, email, role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile?.role !== "admin") {
          await supabase.auth.signOut();
          navigate("/admin", { replace: true });
          return;
        }

        if (active) {
          setAdminUser({
            name: profile.name || "Admin",
            email: profile.email || session.user.email,
          });
          setInitializing(false);
        }
      } catch (err) {
        console.error("Failed to prepare admin layout:", err);
        navigate("/admin", { replace: true });
      } finally {
        if (active) setInitializing(false);
      }
    };

    loadAdmin();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      // Clear cached Supabase keys to be safe
      const localKeys = Object.keys(localStorage);
      localKeys.forEach((key) => {
        if (key.includes("supabase") || key.includes("sb-")) {
          localStorage.removeItem(key);
        }
      });

      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach((key) => {
        if (key.includes("supabase") || key.includes("sb-")) {
          sessionStorage.removeItem(key);
        }
      });

      window.location.href = "/admin";
    }
  };

  if (initializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", sidebarOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 bg-black/20" onClick={() => setSidebarOpen(false)}></div>
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-background">
          <SidebarHeader className="flex items-center justify-between px-6">
            <h1 className="text-xl font-bold">DaBreeder</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </SidebarHeader>
          <SidebarContent>
            <nav className="space-y-1 px-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                    location.pathname.startsWith(item.path)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </SidebarContent>
          {adminUser && (
            <SidebarFooter className="p-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {adminUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{adminUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{adminUser.email}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </SidebarFooter>
          )}
        </div>
      </div>

      {/* Desktop sidebar */}
      <Sidebar className="hidden lg:flex">
        <SidebarHeader className="px-6">
          <h1 className="text-xl font-bold">DaBreeder</h1>
        </SidebarHeader>
        <SidebarContent>
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                  location.pathname.startsWith(item.path)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SidebarContent>
        {adminUser && (
          <SidebarFooter className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {adminUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{adminUser.name}</p>
                <p className="text-xs text-muted-foreground truncate">{adminUser.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        )}
      </Sidebar>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b bg-background px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold">{currentNavItem.label || "Admin Panel"}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
