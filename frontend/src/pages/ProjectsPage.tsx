import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { Modal } from "../components/Modal";
import { Spinner } from "../components/Spinner";
import { ProjectForm } from "../features/projects/ProjectForm";
import { useProjects } from "../hooks/useProjects";
import { formatDate } from "../utils/dates";

export const ProjectsPage: React.FC = () => {
  const { data: projects, isPending, isError, error, refetch } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const renderContent = () => {
    if (isPending) return <Spinner label="Loading projects…" />;
    if (isError) return <ErrorMessage error={error} onRetry={() => refetch()} />;
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
