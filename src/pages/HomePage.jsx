import { useEffect } from "react";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Community from "../components/Community";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import "./HomePage.css"; // warm dog-lover theme

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to their dogs page, or admins to admin dashboard
  useEffect(() => {
    if (user) {
      // Check if user is an admin
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/my-dog");
      }
    }
  }, [user, navigate]);

  // Set page title
  useEffect(() => {
    document.title = "DaBreeder 🐾 | Find Your Perfect Breeding Match";
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate("/my-dog");
    } else {
      // This will be handled by the parent Layout component's auth modal
      // For now, we'll just trigger the auth modal in the parent
      window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { mode: "signup" } }));
    }
  };

  return (
    <>
      <Hero onGetStarted={handleGetStarted} />
      <Features />
      <HowItWorks />
      <Community />
    </>
  );
}
