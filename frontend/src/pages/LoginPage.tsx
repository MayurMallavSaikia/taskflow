import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/shared/lib/redux";
import { LoginForm, selectIsAuthenticated } from "@/features/auth";

export const LoginPage: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();
  // Where ProtectedRoute sent us from (e.g. a shared task link), or the dashboard.
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/projects";

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  return (
    <div className="auth-page">
      <LoginForm onLoggedIn={() => navigate(redirectTo, { replace: true })} />
    </div>
  );
};

