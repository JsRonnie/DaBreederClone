import { useState } from "react";
import MyDogs from "../components/MyDogs";
import { useAuth } from "../hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";

export default function MyDogPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dashboardKey] = useState(0);

  // While auth is resolving, render nothing (or a spinner if desired)
  if (loading) return null;

  // After loading: if not authenticated, redirect declaratively
  if (!user) return <Navigate to="/" replace />;

  const goToAddDog = () => navigate("/add-dog");

  return (
    <div className="flex-1">
      <MyDogs key={dashboardKey} onAddDog={goToAddDog} userId={user.id} />
    </div>
  );
}
