import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { getErrorMessage, getFieldErrors } from "../api/errors";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { useAuth } from "../features/auth/useAuth";
import { validateRegister, type FormErrors, type RegisterForm } from "../features/auth/validation";

const EMPTY_FORM: RegisterForm = { name: "", email: "", password: "", confirmPassword: "" };

export const RegisterPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors<RegisterForm>>({});

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) => {
      login(response);
      navigate("/projects", { replace: true });
    },
    onError: (error) => setErrors(getFieldErrors(error)),
  });

  if (isAuthenticated) return <Navigate to="/projects" replace />;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateRegister(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      mutation.mutate({ name: form.name.trim(), email: form.email.trim(), password: form.password });
    }
  };

  const update = (field: keyof RegisterForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Create your account</h1>
        {mutation.isError && (
          <div className="alert alert-error" role="alert">
            {getErrorMessage(mutation.error)}
          </div>
        )}
        <FormField label="Name" error={errors.name}>
          {(props) => <input {...props} autoComplete="name" value={form.name} onChange={update("name")} />}
        </FormField>
        <FormField label="Email" error={errors.email}>
          {(props) => <input {...props} type="email" autoComplete="email" value={form.email} onChange={update("email")} />}
        </FormField>
        <FormField label="Password" error={errors.password}>
          {(props) => (
            <input {...props} type="password" autoComplete="new-password" value={form.password} onChange={update("password")} />
          )}
        </FormField>
        <FormField label="Confirm password" error={errors.confirmPassword}>
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
            />
          )}
        </FormField>
        <Button type="submit" loading={mutation.isPending} className="btn-block">
          Create account
        </Button>
        <p className="muted">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
};
