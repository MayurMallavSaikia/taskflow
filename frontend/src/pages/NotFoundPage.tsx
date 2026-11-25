import React from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";

export const NotFoundPage: React.FC = () => (
  <EmptyState title="Page not found" action={<Link to="/projects">Go to your projects</Link>} />
);
