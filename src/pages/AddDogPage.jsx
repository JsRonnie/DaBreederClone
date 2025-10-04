import DogForm from "./DogForm";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function AddDogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/");
    return null;
  }

  const handleSubmitted = () => {
    console.log("🐕 Dog submitted, going to dashboard...");
    navigate("/dashboard");
  };

  const goBack = () => {
    navigate("/dashboard");
  };

  return (
    <div className="p-6 sm:p-8 lg:p-12">
      <button
        type="button"
        onClick={goBack}
        className="mb-6 ml-2 sm:ml-4 inline-flex items-center gap-2 rounded-md bg-slate-200 hover:bg-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200"
      >
        ← Back to Dashboard
      </button>
      <DogForm onSubmitted={handleSubmitted} />
    </div>
  );
}
