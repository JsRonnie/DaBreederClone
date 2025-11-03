import { useState } from "react";
import MyDogs from "../components/MyDogs";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function MyDogPage() {
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
