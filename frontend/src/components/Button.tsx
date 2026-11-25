import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}) => (
  <button
    type={type}
    className={`btn btn-${variant} ${className}`.trim()}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...rest}
  >
    {loading ? "Please wait…" : children}
  </button>
);
