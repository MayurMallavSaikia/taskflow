import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, SessionWatcher } from "@/features/auth";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProjectBoardPage } from "@/pages/ProjectBoardPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { AppLayout } from "./layout/AppLayout";

export const App: React.FC = () => (
  <>
    <SessionWatcher />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectBoardPage />} />
          {/* Shareable task link: the board with this task's panel open. */}
          <Route path="/projects/:projectId/tasks/:taskId" element={<ProjectBoardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  </>
);

