import React, { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import AuthProvider from "./context/AuthContext";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import NotificationBox from "./components/NotificationBox";
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
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminDogsPage = lazy(() => import("./pages/AdminDogsPage"));
const AdminForumPage = lazy(() => import("./pages/AdminForumPage"));
const AdminMessagesPage = lazy(() => import("./pages/AdminMessagesPage"));
const AdminReportsPage = lazy(() => import("./pages/AdminReportsPage"));
// ...existing code...
const AdminLayout = lazy(() => import("./components/AdminLayout"));

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<div style={{ padding: 20 }}>Loading…</div>}>
            <Routes>
              {/* Admin Routes - Outside Layout */}
              <Route path="/admin" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="dogs" element={<AdminDogsPage />} />
                <Route path="forum" element={<AdminForumPage />} />
                <Route path="messages" element={<AdminMessagesPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                // ...existing code...
              </Route>

              {/* Regular Routes - Inside Layout */}
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
                <Route path="chat" element={<ChatPage />} />
                <Route path="chat/:contactId" element={<ChatPage />} />
                <Route path="notifications" element={<NotificationBox />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
