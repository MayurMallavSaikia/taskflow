import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { Button } from "./Button";

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/projects" className="brand">
          TaskFlow
        </Link>
        <div className="app-header-user">
          <span className="muted hide-on-mobile">{user?.name}</span>
          <Button variant="ghost" onClick={logout}>
            Log out
          </Button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};
