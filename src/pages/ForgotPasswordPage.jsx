import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import supabase from "../lib/supabaseClient";
import ErrorMessage from "../components/ErrorMessage";
import "./ForgotPasswordPage.css"; // warm dog-lover theme

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  // Code-only flow: we always send a code and verify it; no link mode UI

  // Prefill email from query param if provided
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");
    if (emailParam) setEmail(emailParam.trim());
  }, [location.search]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    const emailClean = email.trim().toLowerCase();
    if (!emailClean) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      const origin =
        (import.meta.env && import.meta.env.VITE_SITE_URL) ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const { error: err } = await supabase.auth.resetPasswordForEmail(emailClean, {
        redirectTo: origin ? `${origin}/change-password` : undefined,
      });
      if (err) throw err;
      setInfo(
        "If an account exists for that email, we've sent a password reset link. Please check your inbox."
      );
    } catch (e) {
      const raw = e?.message || "Couldn't send reset email.";
      const lc = raw.toLowerCase();
      let friendly = raw;
      if (lc.includes("for security reasons") && lc.includes("redirects")) {
        friendly =
          "Supabase blocked the redirect URL. In Supabase → Authentication → URL Configuration → Redirect URLs, add /change-password for your site URL.";
      } else if (lc.includes("email provider") && lc.includes("disabled")) {
        friendly =
          "Email sign-in provider is disabled. Enable it in Supabase → Authentication → Providers → Email.";
      } else if (lc.includes("smtp") || lc.includes("email not sent")) {
        friendly =
          "Email could not be sent. Check SMTP/System Email settings in Supabase and project email quotas.";
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !code.trim()) {
      setError("Enter your email and the code from your email.");
      return;
    }
    try {
      setVerifying(true);
      const { error: err } = await supabase.auth.verifyOtp({
        email: emailClean,
        token: code.trim(),
        type: "recovery",
      });
      if (err) throw err;
      // After verification, Supabase authenticates the user; redirect to change password
      navigate("/change-password");
    } catch (e2) {
      const raw = e2?.message || "Code verification failed.";
      const lc = raw.toLowerCase();
      let friendly = raw;
      if (lc.includes("expired") || lc.includes("invalid")) {
        friendly = "That code is invalid or expired. Request a new reset email.";
      }
      setError(friendly);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="forgot-password-page">
      <div className="w-full max-w-md">
        <div className="forgot-password-card">
          <div className="forgot-password-header text-center mb-6">
            <h1>Password recovery 🐾</h1>
            <p>Enter your email to receive a one-time recovery code, then paste it below.</p>
          </div>

          {error && <ErrorMessage message={error} />}
          {info && <div className="forgot-password-info">{info}</div>}

          {/* Send code */}
          <form onSubmit={handleSubmit} className="grid gap-4 mb-6">
            <div>
              <label className="forgot-password-label">Email address</label>
              <input
                className="forgot-password-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="forgot-password-btn">
              {loading ? "Sending…" : "Send recovery code"}
            </button>
          </form>

          {/* Verify code */}
          <form onSubmit={handleVerifyCode} className="grid gap-4">
            <div>
              <label className="forgot-password-label">One-time code</label>
              <input
                className="forgot-password-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </div>
            <button type="submit" disabled={verifying} className="forgot-password-btn verify-btn">
              {verifying ? "Verifying…" : "Verify code & continue"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/" className="forgot-password-link inline-flex items-center gap-2">
              <FaArrowLeft />
              <span>Back to home</span>
            </Link>
            <Link to="/" className="forgot-password-link-primary">
              Remembered it? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
