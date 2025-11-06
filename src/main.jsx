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
const MyDogPage = lazy(() => import("./pages/MyDogPage"));
const AddDogPage = lazy(() => import("./pages/AddDogPage"));
const DogProfilePage = lazy(() => import("./pages/DogProfilePage"));
const DogEditPage = lazy(() => import("./pages/DogEditPage"));
const FindMatchPage = lazy(() => import("./pages/FindMatchPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));
const ForumPage = lazy(() => import("./pages/ForumPage"));
const ThreadPage = lazy(() => import("./pages/ThreadPage"));

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
              <Route path="my-dog" element={<MyDogPage />} />
              <Route path="add-dog" element={<AddDogPage />} />
              <Route path="dog/:id" element={<DogProfilePage />} />
              <Route path="dog/:id/edit" element={<DogEditPage />} />
              <Route path="find-match" element={<FindMatchPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="change-password" element={<ChangePasswordPage />} />
              <Route path="forum" element={<ForumPage />} />
              <Route path="thread/:id" element={<ThreadPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  </StrictMode>
);
