import React from "react";
import { getErrorMessage } from "../api/errors";
import { Button } from "./Button";

interface ErrorMessageProps {
  error: unknown;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => (
  <div className="alert alert-error" role="alert">
    <span>{getErrorMessage(error)}</span>
    {onRetry && (
      <Button variant="secondary" onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);
