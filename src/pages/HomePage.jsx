import { useEffect } from "react";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Community from "../components/Community";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to their dogs page
  useEffect(() => {
    if (user) {
      navigate("/my-dog");
    }
  }, [user, navigate]);

  const handleGetStarted = () => {
    if (user) {
      navigate("/my-dog");
    } else {
      // This will be handled by the parent Layout component's auth modal
      // For now, we'll just trigger the auth modal in the parent
      window.dispatchEvent(
        new CustomEvent("openAuthModal", { detail: { mode: "signup" } })
      );
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
