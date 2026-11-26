import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDate } from "@/shared/lib/dates";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorMessage } from "@/shared/ui/ErrorMessage";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import { fetchProjects, selectProjectList, selectProjectListState } from "@/entities/project";
import { selectCurrentUser } from "@/features/auth";
import { ProjectForm } from "@/features/project-create";

export const ProjectsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const projects = useAppSelector(selectProjectList);
  const request = useAppSelector(selectProjectListState);
  const user = useAppSelector(selectCurrentUser);
  const [showForm, setShowForm] = useState(false);

  // Refresh on every visit; whatever is cached shows meanwhile. Not aborted on unmount: the thunk
  // skips itself while a fetch is in flight, so aborting would leave a remount (React StrictMode,
  // quick back/forward) with no request at all.
  useEffect(() => {
    void dispatch(fetchProjects());
  }, [dispatch]);

  const loadedOnce = request.status === "succeeded" || projects.length > 0;

  const renderContent = () => {
    if (!loadedOnce) {
      if (request.status === "failed") return <ErrorMessage error={request.error} onRetry={() => dispatch(fetchProjects())} />;
      return <Spinner label="Loading projects…" />;
    }
    if (projects.length === 0) {
      return (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking tasks."
          action={<Button onClick={() => setShowForm(true)}>New project</Button>}
        />
      );
    }
    return (
      <ul className="project-grid">
        {projects.map((project) => (
          <li key={project.id}>
            <Link to={`/projects/${project.id}`} className="card project-card">
              <h2>{project.name}</h2>
              {project.description && <p className="muted">{project.description}</p>}
              {project.owner.id !== user?.id && <span className="badge project-shared-badge">Shared by {project.owner.name}</span>}
              <span className="muted small">Created {formatDate(project.createdAt.slice(0, 10))}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section>
      <div className="page-header">
        <h1>Projects</h1>
        <Button onClick={() => setShowForm(true)}>New project</Button>
      </div>
      {renderContent()}
      {showForm && (
        <Modal title="New project" onClose={() => setShowForm(false)}>
          <ProjectForm
            onCancel={() => setShowForm(false)}
            onCreated={(project) => {
              setShowForm(false);
              navigate(`/projects/${project.id}`);
            }}
          />
        </Modal>
      )}
    </section>
  );
};

