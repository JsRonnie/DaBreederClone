import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AuthModal from "../components/AuthModal";
import Footer from "../components/Footer";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

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
    navigate("/dashboard");
    setSidebarOpen(false);
    setAuthOpen(false);
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

      <Footer />
    </div>
  );
}
