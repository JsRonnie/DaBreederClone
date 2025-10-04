import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";
import AuthProvider from "./context/AuthContext";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import DashboardPage from "./pages/DashboardPage";
import AddDogPage from "./pages/AddDogPage";
import DogProfilePage from "./pages/DogProfilePage";
import DogEditPage from "./pages/DogEditPage";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="add-dog" element={<AddDogPage />} />
            <Route path="dog/:id" element={<DogProfilePage />} />
            <Route path="dog/:id/edit" element={<DogEditPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  </StrictMode>
);
