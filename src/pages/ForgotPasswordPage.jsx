import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import supabase from "../lib/supabaseClient";
import ErrorMessage from "../components/ErrorMessage";

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
    <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 p-6 sm:p-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">Password recovery</h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter your email to receive a one-time recovery code, then paste it below.
            </p>
          </div>

          {error && <ErrorMessage message={error} />}
          {info && (
            <div className="mb-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
              {info}
            </div>
          )}

          {/* Send code */}
          <form onSubmit={handleSubmit} className="grid gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-slate-700">Email address</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-white font-medium ${
                loading ? "bg-blue-600/60 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Sending…" : "Send recovery code"}
            </button>
          </form>

          {/* Verify code */}
          <form onSubmit={handleVerifyCode} className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">One-time code</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </div>
            <button
              type="submit"
              disabled={verifying}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-white font-medium ${
                verifying ? "bg-green-600/60 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {verifying ? "Verifying…" : "Verify code & continue"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              to="/"
              className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-2"
            >
              <FaArrowLeft />
              <span>Back to home</span>
            </Link>
            <Link to="/" className="text-blue-600 hover:underline">
              Remembered it? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
