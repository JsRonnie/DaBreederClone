import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { validatePassword, passwordPolicyNote } from "../utils/passwordRules";
import "./ChangePasswordPage.css"; // warm dog-lover theme

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [recoverySession, setRecoverySession] = useState(false); // Indicates user arrived via recovery link (already has a temporary session)
  // Field visibility toggles removed for now (simplify UI)

  // Detect if we are in a recovery flow (Supabase sets a session when using confirmation link)
  useEffect(() => {
    const detect = async () => {
      const { data } = await supabase.auth.getSession();
      // If there's a session but no app-level user yet, treat as recovery; or if query contains type=recovery
      const url = new URL(window.location.href);
      const type = url.searchParams.get("type");
      if (type === "recovery" && data.session) {
        setRecoverySession(true);
      } else if (data.session && !user) {
        // Might still be a recovery before context loads
        setRecoverySession(true);
      }
    };
    detect();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Basic validations
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage("Error: Passwords do not match");
      setLoading(false);
      return;
    }

    const pwErr = validatePassword(passwords.newPassword, {
      email: user?.email,
      username: user?.name,
    });
    if (pwErr) {
      setMessage(`Error: ${pwErr}`);
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });
      if (error) throw error;

      setMessage("Password updated successfully!");
      setPasswords({
        newPassword: "",
        confirmPassword: "",
      });

      // After recovery flow, keep the user logged in and redirect to home (or another page)
      if (recoverySession) {
        setTimeout(() => {
          navigate("/");
        }, 800);
      }
    } catch (error) {
      console.error("Error updating password:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const arrivingViaRecovery = recoverySession && !user;

  if (arrivingViaRecovery) {
    return (
      <div className="change-password-page">
        <div className="change-password-card">
          <div className="change-password-header">
            <h1>Set a new password 🐾</h1>
          </div>
          {message && (
            <div
              className={`change-password-message ${
                message.includes("Error") ? "message-error" : "message-success"
              }`}
            >
              {message}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="change-password-label">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwords.newPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                required
                minLength={8}
                className="change-password-input"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="change-password-label">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords((p) => ({
                    ...p,
                    confirmPassword: e.target.value,
                  }))
                }
                required
                minLength={8}
                className="change-password-input"
                placeholder="Confirm new password"
              />
            </div>
            <button type="submit" disabled={loading} className="change-password-btn w-full">
              {loading ? "Updating..." : "Save New Password"}
            </button>
            <p className="text-xs text-gray-500">
              After saving, you’ll stay signed in and be redirected.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <div className="change-password-header">
          <h1>Change Password 🐾</h1>
        </div>

        {message && (
          <div
            className={`change-password-message ${
              message.includes("Error") ? "message-error" : "message-success"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="change-password-label">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwords.newPassword}
              onChange={handleChange}
              required
              minLength={8}
              className="change-password-input"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="change-password-label">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwords.confirmPassword}
              onChange={handleChange}
              required
              minLength={8}
              className="change-password-input"
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="change-password-btn flex-1">
              {loading ? "Updating..." : "Change Password"}
            </button>
            <button type="button" onClick={() => window.history.back()} className="cancel-btn">
              Cancel
            </button>
          </div>
        </form>

        <div className="password-requirements">
          <h3>Password Requirements:</h3>
          <pre>{passwordPolicyNote}</pre>
        </div>
      </div>
    </div>
  );
}
