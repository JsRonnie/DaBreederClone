import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import MyDogs from "../components/MyDogs";

export default function MyDogsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardKey] = useState(0);

  if (!user) {
    navigate("/");
    return null;
  }

  const goToAddDog = () => navigate("/add-dog");

  return (
    <div className="flex-1">
      <MyDogs key={dashboardKey} onAddDog={goToAddDog} userId={user.id} />
    </div>
  );
}
