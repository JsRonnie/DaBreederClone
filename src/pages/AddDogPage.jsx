import DogForm from "./DogForm";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import "./FindMatchPage.css";

export default function AddDogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/");
    return null;
  }

  const handleSubmitted = () => {
    console.log("🐕 Dog submitted, going to my dogs...");
    navigate("/my-dog");
  };

  return (
    <div className="find-match-container">
      {/* Header Section */}
      <div className="header-section">
        <h1 className="page-title">Add New Dog</h1>
        <p className="page-description">
          Register your dog's profile to connect with other breeders
        </p>
      </div>

      {/* Main Content */}
      <div className="content-section">
        <DogForm onSubmitted={handleSubmitted} />
      </div>
    </div>
  );
}
