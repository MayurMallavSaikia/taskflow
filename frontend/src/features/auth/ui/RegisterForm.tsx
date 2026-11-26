import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "@/shared/api/errors";
import { useAppDispatch } from "@/shared/lib/redux";
import { useAsyncAction } from "@/shared/lib/useAsyncAction";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { validateRegister, type FormErrors, type RegisterForm as RegisterValues } from "../lib/validation";
import { register } from "../model/authSlice";

const EMPTY_FORM: RegisterValues = { name: "", email: "", password: "", confirmPassword: "" };

interface RegisterFormProps {
  onRegistered: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onRegistered }) => {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState<RegisterValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors<RegisterValues>>({});
  const submit = useAsyncAction((values: { name: string; email: string; password: string }) =>
    dispatch(register(values)).unwrap(),
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateRegister(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    const result = await submit.run({ name: form.name.trim(), email: form.email.trim(), password: form.password });
    if (result.ok) onRegistered();
    else setErrors(result.error.fieldErrors);
  };

  const update = (field: keyof RegisterValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  return (
    <form className="card auth-card" onSubmit={handleSubmit} noValidate>
      <h1>Create your account</h1>
      {submit.error && (
        <div className="alert alert-error" role="alert">
          {getErrorMessage(submit.error)}
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
      <Button type="submit" loading={submit.isPending} className="btn-block">
        Create account
      </Button>
      <p className="muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
};

