import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import supabase from "../lib/supabaseClient";
import { upsertUserProfile } from "../lib/profile";
import { validatePassword } from "../utils/passwordRules";

export default function AuthModal({ open, mode = "signin", onClose, onSwitch, onAuthSuccess }) {
  const navigate = useNavigate();
  const isSignUp = mode === "signup";
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const didCompleteRef = useRef(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Clear messages and reset loading when switching modes or (re)opening
    setErrorMsg("");
    setInfoMsg("");
    setLoading(false);
    setAgreedToTerms(false);
    didCompleteRef.current = false;
    // When modal closes, clear sensitive fields like password
    if (!open) {
      setPassword("");
    }
  }, [mode, open]);

  function toAppUser(session) {
    const user = session?.user;
    if (!user) return null;
    const meta = user.user_metadata || {};
    return {
      name: meta.name || meta.full_name || user.email?.split("@")[0] || "User",
      role: "Dog Owner",
      avatarUrl:
        meta.avatar_url ||
        meta.avatarUrl ||
        "https://api.dicebear.com/9.x/initials/svg?seed=" + encodeURIComponent(user.email || "U"),
    };
  }

  const handlePrimary = async () => {
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      if (!email || !password) {
        throw new Error("Please enter email and password.");
      }

      if (isSignUp && !agreedToTerms) {
        throw new Error("Please agree to the terms and policy to continue.");
      }

      // Sanitize inputs for common copy/paste issues
      const emailClean = email
        .trim()
        .replace(/^["']|["']$/g, "")
        .toLowerCase();

      // Additional password checks for sign up
      if (isSignUp) {
        const pwError = validatePassword(password, {
          email: emailClean,
          username: name,
        });
        if (pwError) {
          throw new Error(pwError);
        }
      }

      if (isSignUp) {
        const origin =
          (import.meta.env && import.meta.env.VITE_SITE_URL) ||
          (typeof window !== "undefined" ? window.location.origin : "");
        // Sign up: may require email confirmation, thus session can be null
        const { data, error } = await supabase.auth.signUp({
          email: emailClean,
          password,
          options: {
            data: name ? { name } : undefined,
            emailRedirectTo: origin || undefined,
          },
        });
        if (error) throw error;

        if (!data.session) {
          // Email confirmation required
          setInfoMsg("Check your email to confirm your account before logging in.");
          return;
        }

        const appUser = toAppUser(data.session);
        if (appUser) {
          await upsertUserProfile(supabase, data.session.user);
          onAuthSuccess?.(appUser);
          // Close modal after successful sign up
          onClose?.();
          didCompleteRef.current = true;
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailClean,
          password,
        });
        if (error) throw error;
        if (!data.session) throw new Error("Login failed: no session returned.");

        const appUser = toAppUser(data.session);
        if (appUser) {
          await upsertUserProfile(supabase, data.session.user);
          onAuthSuccess?.(appUser);
          // Close modal after successful login
          onClose?.();
          didCompleteRef.current = true;
        }
      }
    } catch (e) {
      const raw = e?.message || "Authentication failed.";
      let friendly = raw;
      const lc = raw.toLowerCase();
      if (lc.includes("signup") && lc.includes("disable")) {
        friendly =
          'Email signups are disabled in your Supabase project. In Supabase Studio → Authentication → Providers → Email, turn ON "Allow users to sign up" (and ensure global signups aren’t disabled in Authentication → Settings).';
      } else if (lc.includes("email") && lc.includes("invalid")) {
        friendly =
          "Supabase rejected the email string. If you disabled confirmations for dev, you can still use any address like a@b.co, but make sure it looks like an email.";
      }
      setErrorMsg(friendly);
    } finally {
      setLoading(false);
    }
  };

  // As a safety net: if Supabase reports SIGNED_IN while the modal is open,
  // auto-close and dispatch success once. This covers delayed session cases.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && open && !didCompleteRef.current) {
        const appUser = toAppUser(session);
        if (appUser) {
          try {
            await upsertUserProfile(supabase, session.user);
          } catch {
            // ignore profile upsert errors here
          }
          onAuthSuccess?.(appUser);
        }
        onClose?.();
        setLoading(false);
        didCompleteRef.current = true;
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [open, onAuthSuccess, onClose]);

  // Deprecated inline reset flow; we now use a dedicated page

  return (
    <Modal open={open} onClose={onClose} widthClass="max-w-5xl">
      <div className="relative">
        {/* Close button */}
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-6"
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 min-h-[600px]">
          {/* Left: form */}
          <div className="bg-slate-50 p-6 sm:p-10 flex items-center justify-center">
            <div className="w-full max-w-md text-center">
              <div className="transition-all duration-300 ease-in-out transform">
                <h2 className="text-2xl font-semibold text-slate-900 transition-all duration-300">
                  {isSignUp ? "Get Started Now" : "Welcome back!"}
                </h2>
                <p className="mt-2 text-sm text-slate-600 transition-all duration-300">
                  {isSignUp
                    ? "Join our community of responsible dog breeders"
                    : "Enter your credentials to access your account"}
                </p>
              </div>

              <form
                className="mt-8 grid gap-4 text-left"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!loading) handlePrimary();
                }}
              >
                {isSignUp && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Name</label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-700">Email address</label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          // Close the auth modal and navigate to the dedicated Forgot Password page
                          try {
                            onClose?.();
                          } finally {
                            // Defer navigation to ensure modal state updates first
                            setTimeout(() => navigate("/forgot-password"), 0);
                          }
                        }}
                        className="text-xs text-slate-600 hover:text-slate-900"
                      >
                        Forgot password
                      </button>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:border-slate-400"
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-400 hover:text-slate-600 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        // Eye slash icon (password visible - click to hide)
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                          />
                        </svg>
                      ) : (
                        // Eye icon (password hidden - click to show)
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {isSignUp && (
                    <p className="mt-1 text-xs text-slate-500">
                      At least 8 characters. Don’t use your email or username.
                    </p>
                  )}
                </div>

                {isSignUp && (
                  <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      className="size-4 accent-blue-600"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                    />
                    I agree to the{" "}
                    <a href="#" className="underline">
                      terms & policy
                    </a>
                  </label>
                )}

                {errorMsg && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    {errorMsg}
                  </div>
                )}
                {infoMsg && (
                  <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
                    {infoMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`mt-2 inline-flex items-center justify-center rounded-md px-4 py-2 text-white font-medium ${
                    loading
                      ? "bg-green-600/60 cursor-not-allowed"
                      : "bg-green-700 hover:bg-green-800"
                  }`}
                >
                  {loading
                    ? isSignUp
                      ? "Signing up…"
                      : "Logging in…"
                    : isSignUp
                      ? "Sign Up"
                      : "Login"}
                </button>

                <p className="text-sm text-slate-700 text-center">
                  {isSignUp ? (
                    <>
                      Have an account?{" "}
                      <button
                        type="button"
                        className="text-blue-600 hover:underline"
                        onClick={() => onSwitch?.("signin")}
                      >
                        Sign In
                      </button>
                    </>
                  ) : (
                    <>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        className="text-blue-600 hover:underline"
                        onClick={() => onSwitch?.("signup")}
                      >
                        Sign Up
                      </button>
                    </>
                  )}
                </p>
              </form>
            </div>
          </div>

          {/* Right: image */}
          {windowWidth >= 640 && (
            <div
              className="relative w-full h-full min-h-[600px] bg-[url('/shibaPor.jpg')] bg-cover bg-center"
              style={{ backgroundColor: "#e2e8f0" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
