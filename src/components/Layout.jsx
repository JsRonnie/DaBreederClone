import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AuthModal from "../components/AuthModal";
import Footer from "../components/Footer";
import Toast from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on a chat page
  const isChatPage = location.pathname.startsWith("/chat");

  // Listen for auth modal events
  useEffect(() => {
    const handleOpenAuth = (event) => {
      setAuthMode(event.detail?.mode || "signin");
      setAuthOpen(true);
    };

    window.addEventListener("openAuthModal", handleOpenAuth);
    return () => window.removeEventListener("openAuthModal", handleOpenAuth);
  }, []);

  const handleAuthSuccess = (u) => {
    setUser(u);
    navigate("/my-dog");
    setSidebarOpen(false);
    setAuthOpen(false);
    // Force a hard refresh shortly after login so all client state reflects the new session
    window.setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onMenuClick={() => setSidebarOpen(true)}
        onSignInClick={() => {
          setAuthMode("signin");
          setAuthOpen(true);
        }}
        onSignUpClick={() => {
          setAuthMode("signup");
          setAuthOpen(true);
        }}
        user={user}
        onNavigate={handleNavigate}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onSwitch={(m) => setAuthMode(m)}
        onAuthSuccess={handleAuthSuccess}
      />

      <main className="flex-1">
        <Outlet />
      </main>

      <Toast />

      {!isChatPage && <Footer />}
    </div>
  );
}
