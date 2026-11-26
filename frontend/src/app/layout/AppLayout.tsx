import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { Button } from "@/shared/ui/Button";
import { logOut, selectCurrentUser } from "@/features/auth";

export const AppLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/projects" className="brand">
          TaskFlow
        </Link>
        <div className="app-header-user">
          <span className="muted hide-on-mobile">{user?.name}</span>
          <Button variant="ghost" onClick={() => dispatch(logOut())}>
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

