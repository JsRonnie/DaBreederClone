import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import MyMatches from "../components/MyMatches";

export default function MyMatchesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (user.role === "admin") {
    navigate("/admin/dashboard", { replace: true });
    return null;
  }

  return (
    <div className="flex-1">
      <MyMatches userId={user.id} />
    </div>
  );
}
