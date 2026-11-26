import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/shared/lib/redux";
import { RegisterForm, selectIsAuthenticated } from "@/features/auth";

export const RegisterPage: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to="/projects" replace />;

  return (
    <div className="auth-page">
      <RegisterForm onRegistered={() => navigate("/projects", { replace: true })} />
    </div>
  );
};

