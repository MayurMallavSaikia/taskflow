import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { getErrorMessage, getFieldErrors } from "../api/errors";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { useAuth } from "../features/auth/useAuth";
import { validateLogin, type FormErrors, type LoginForm } from "../features/auth/validation";

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/projects";

  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors<LoginForm>>({});

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      login(response);
      navigate(redirectTo, { replace: true });
    },
    onError: (error) => setErrors(getFieldErrors(error)),
  });

  if (isAuthenticated) return <Navigate to="/projects" replace />;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      mutation.mutate({ email: form.email.trim(), password: form.password });
    }
  };

  const update = (field: keyof LoginForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Log in to TaskFlow</h1>
        {sessionExpired && !mutation.isError && (
          <div className="alert alert-info" role="status">
            Your session has expired. Please log in again.
          </div>
        )}
        {mutation.isError && (
          <div className="alert alert-error" role="alert">
            {getErrorMessage(mutation.error)}
          </div>
        )}
        <FormField label="Email" error={errors.email}>
          {(props) => <input {...props} type="email" autoComplete="email" value={form.email} onChange={update("email")} />}
        </FormField>
        <FormField label="Password" error={errors.password}>
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={update("password")}
            />
          )}
        </FormField>
        <Button type="submit" loading={mutation.isPending} className="btn-block">
          Log in
        </Button>
        <p className="muted">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
};
