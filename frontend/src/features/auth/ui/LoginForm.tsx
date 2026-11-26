import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "@/shared/api/errors";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { useAsyncAction } from "@/shared/lib/useAsyncAction";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { validateLogin, type FormErrors, type LoginForm as LoginValues } from "../lib/validation";
import { logIn, logInAsGuest, selectSessionExpired } from "../model/authSlice";

interface LoginFormProps {
  /** Called after a successful login (password or guest). */
  onLoggedIn: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoggedIn }) => {
  const dispatch = useAppDispatch();
  const sessionExpired = useAppSelector(selectSessionExpired);
  const [form, setForm] = useState<LoginValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors<LoginValues>>({});

  const login = useAsyncAction((values: LoginValues) => dispatch(logIn(values)).unwrap());
  const guest = useAsyncAction(() => dispatch(logInAsGuest()).unwrap());
  // Only one error banner at a time: whichever action the user tried last.
  const activeError = login.error ?? guest.error;
  const busy = login.isPending || guest.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    guest.reset();
    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    const result = await login.run({ email: form.email.trim(), password: form.password });
    if (result.ok) onLoggedIn();
    else setErrors(result.error.fieldErrors);
  };

  const handleGuest = async () => {
    login.reset();
    setErrors({});
    if ((await guest.run()).ok) onLoggedIn();
  };

  const update = (field: keyof LoginValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  return (
    <form className="card auth-card" onSubmit={handleSubmit} noValidate>
      <h1>Log in to TaskFlow</h1>
      {sessionExpired && !activeError && (
        <div className="alert alert-info" role="status">
          Your session has expired. Please log in again.
        </div>
      )}
      {activeError && (
        <div className="alert alert-error" role="alert">
          {getErrorMessage(activeError)}
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
      <Button type="submit" loading={login.isPending} disabled={busy} className="btn-block">
        Log in
      </Button>
      <div className="auth-divider">or</div>
      <Button variant="secondary" loading={guest.isPending} disabled={busy} className="btn-block" onClick={handleGuest}>
        Continue as guest
      </Button>
      <p className="muted">
        No account yet? <Link to="/register">Create one</Link>
      </p>
    </form>
  );
};

