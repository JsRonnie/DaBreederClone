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
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Set a new password</h1>
          {message && (
            <div
              className={`mb-4 p-4 rounded-md ${
                message.includes("Error")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}
            >
              {message}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-400 disabled:cursor-not-allowed"
            >
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
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h1>

        {message && (
          <div
            className={`mb-4 p-4 rounded-md ${
              message.includes("Error")
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Change Password"}
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h3>
          <pre className="text-sm text-gray-600 whitespace-pre-wrap">{passwordPolicyNote}</pre>
        </div>
      </div>
    </div>
  );
}
