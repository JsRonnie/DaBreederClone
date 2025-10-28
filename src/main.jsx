import React, { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";
import AuthProvider from "./context/AuthContext";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
// Lazy-load heavier pages to reduce initial bundle size
const ContactPage = lazy(() => import("./pages/ContactPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AddDogPage = lazy(() => import("./pages/AddDogPage"));
const DogProfilePage = lazy(() => import("./pages/DogProfilePage"));
const DogEditPage = lazy(() => import("./pages/DogEditPage"));
const FindMatchPage = lazy(() => import("./pages/FindMatchPage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const MyDogsPage = lazy(() => import("./pages/MyDogsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Router>
        <Suspense fallback={<div style={{ padding: 20 }}>Loading…</div>}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="my-dogs" element={<MyDogsPage />} />
              <Route path="add-dog" element={<AddDogPage />} />
              <Route path="dog/:id" element={<DogProfilePage />} />
              <Route path="dog/:id/edit" element={<DogEditPage />} />
              <Route path="find-match" element={<FindMatchPage />} />
              <Route path="edit-profile" element={<EditProfilePage />} />
              <Route path="change-password" element={<ChangePasswordPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  </StrictMode>
);
