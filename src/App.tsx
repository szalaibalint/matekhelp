import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginForm from "./components/auth/LoginForm";
import SignUpForm from "./components/auth/SignUpForm";
import Dashboard from "./components/pages/dashboard";
import Success from "./components/pages/success";
const ViewerApp = React.lazy(() => import('./ViewerApp'));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));
const AdminLanding = React.lazy(() => import('./components/admin/AdminLanding'));
const SiteSettings = React.lazy(() => import('./components/admin/SiteSettings'));
import ViewerPage from "./components/viewer/ViewerPage";
import ViewerPresentation from "./components/viewer/ViewerPresentation";
import { AuthProvider, useAuth } from "../supabase/auth";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen } from "./components/ui/loading-spinner";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="Loading..." />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginForm />} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <SignUpForm />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AdminLanding />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminLanding />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/editor"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <PrivateRoute>
              <SiteSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/success"
          element={
            <Success />
          }
        />
        <Route path="/viewer/*" element={<ViewerApp />} />
        <Route path="/viewer/:id" element={<ViewerPresentation />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen text="Loading application..." />}>
        <AppRoutes />
      </Suspense>
      <Toaster />
    </AuthProvider>
  );
}

export default App;