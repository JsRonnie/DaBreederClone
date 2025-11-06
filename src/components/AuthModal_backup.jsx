import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import supabase from "../lib/supabaseClient";
import { upsertUserProfile } from "../lib/profile";

export default function AuthModal({
  open,
  mode = "signin",
  onClose,
  onSwitch,
  onAuthSuccess,
}) {
  const isSignUp = mode === "signup";
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

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
    setShowForgotPassword(false);
    setForgotPasswordEmail("");
    setForgotPasswordLoading(false);
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
        "https://api.dicebear.com/9.x/initials/svg?seed=" +
          encodeURIComponent(user.email || "U"),
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

      // Sanitize inputs for common copy/paste issues
      const emailClean = email
        .trim()
        .replace(/^["']|["']$/g, "")
        .toLowerCase();
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      if (isSignUp) {
        // Sign up: may require email confirmation, thus session can be null
        const origin =
          (import.meta.env && import.meta.env.VITE_SITE_URL) ||
          (typeof window !== "undefined" ? window.location.origin : "");
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
          setInfoMsg(
            "Check your email to confirm your account before logging in."
          );
          return;
        }

        const appUser = toAppUser(data.session);
        if (appUser) {
          await upsertUserProfile(supabase, data.session.user);
          onAuthSuccess?.(appUser);
          onClose?.();
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailClean,
          password,
        });
        if (error) throw error;
        if (!data.session)
          throw new Error("Login failed: no session returned.");

        const appUser = toAppUser(data.session);
        if (appUser) {
          await upsertUserProfile(supabase, data.session.user);
          onAuthSuccess?.(appUser);
          onClose?.();
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    if (!forgotPasswordEmail) {
      setErrorMsg("Please enter your email address");
      setForgotPasswordLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      setErrorMsg("Please enter a valid email address");
      setForgotPasswordLoading(false);
      return;
    }

    try {
      const origin =
        (import.meta.env && import.meta.env.VITE_SITE_URL) ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotPasswordEmail,
        {
          redirectTo: origin ? `${origin}/change-password` : undefined,
        }
      );

      if (error) throw error;

      setInfoMsg(
        "Password reset email sent! Please check your inbox and follow the instructions."
      );
      setForgotPasswordEmail("");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      setErrorMsg(error.message || "Failed to send password reset email");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

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
              <h2 className="text-2xl font-semibold text-slate-900">
                {isSignUp ? "Get Started Now" : "Welcome back!"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {isSignUp
                  ? "Join our community of responsible dog breeders"
                  : "Enter your credentials to access your account"}
              </p>

              {showForgotPassword && !isSignUp && (
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Reset Password
                  </h3>
                  <p className="text-sm text-slate-600">
                    Enter your email address and we'll send you a link to reset
                    your password.
                  </p>
                </div>
              )}

              <form
                className="mt-8 grid gap-4 text-left"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!loading && !forgotPasswordLoading) {
                    showForgotPassword && !isSignUp
                      ? handleForgotPassword(e)
                      : handlePrimary();
                  }
                }}
              >
                {showForgotPassword && !isSignUp ? (
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Email Address
                    </label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your email"
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <React.Fragment>
                    {isSignUp && (
                      <div>
                        <label className="text-sm font-medium text-slate-700">
                          Name
                        </label>
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Email address
                      </label>
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
                        <label className="text-sm font-medium text-slate-700">
                          Password
                        </label>
                        {!isSignUp && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setShowForgotPassword(true);
                            }}
                            className="text-xs text-slate-600 hover:text-slate-900 underline"
                          >
                            forgot password
                          </button>
                        )}
                      </div>
                      <div className="relative mt-1">
                        <input
                          className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete={
                            isSignUp ? "new-password" : "current-password"
                          }
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-400 hover:text-slate-600 transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
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
                    </div>
                  </React.Fragment>
                )}

                {isSignUp && !showForgotPassword && (
                  <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" className="size-4 accent-blue-600" />
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
                  disabled={loading || forgotPasswordLoading}
                  className={`mt-2 inline-flex items-center justify-center rounded-md px-4 py-2 text-white font-medium ${
                    loading || forgotPasswordLoading
                      ? "bg-green-600/60 cursor-not-allowed"
                      : "bg-green-700 hover:bg-green-800"
                  }`}
                >
                  {showForgotPassword && !isSignUp
                    ? forgotPasswordLoading
                      ? "Sending…"
                      : "Send Reset Email"
                    : loading
                    ? isSignUp
                      ? "Signing up…"
                      : "Logging in…"
                    : isSignUp
                    ? "Signup"
                    : "Login"}
                </button>

                {showForgotPassword && !isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail("");
                      setErrorMsg("");
                      setInfoMsg("");
                    }}
                    className="text-sm text-slate-600 hover:text-slate-900 underline"
                  >
                    ← Back to Sign In
                  </button>
                )}

                {!showForgotPassword && (
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
                )}
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
