import React from "react";

export const Spinner: React.FC<{ label?: string }> = ({ label = "Loading…" }) => (
  <div className="spinner-wrapper" role="status">
    <span className="spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);
