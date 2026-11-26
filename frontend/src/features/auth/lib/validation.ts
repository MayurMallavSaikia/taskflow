const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm extends LoginForm {
  name: string;
  confirmPassword: string;
}

export function validateLogin(form: LoginForm): FormErrors<LoginForm> {
  const errors: FormErrors<LoginForm> = {};
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Enter a valid email address";
  if (!form.password) errors.password = "Password is required";
  return errors;
}

export function validateRegister(form: RegisterForm): FormErrors<RegisterForm> {
  const errors: FormErrors<RegisterForm> = { ...validateLogin(form) };
  if (!form.name.trim()) errors.name = "Name is required";
  else if (form.name.trim().length > 100) errors.name = "Name must be at most 100 characters";
  if (form.password && (form.password.length < 8 || form.password.length > 72)) {
    errors.password = "Password must be between 8 and 72 characters";
  }
  if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords do not match";
  return errors;
}
