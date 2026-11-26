import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => (
  <div className="empty-state">
    <p className="empty-state-title">{title}</p>
    {description && <p className="muted">{description}</p>}
    {action}
  </div>
);
