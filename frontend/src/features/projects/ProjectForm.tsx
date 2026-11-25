import React, { useState } from "react";
import { getErrorMessage, getFieldErrors } from "../../api/errors";
import type { Project } from "../../api/types";
import { Button } from "../../components/Button";
import { FormField } from "../../components/FormField";
import { useCreateProject } from "../../hooks/useProjects";

interface ProjectFormProps {
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ onCreated, onCancel }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createProject = useCreateProject();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }
    setErrors({});
    createProject.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      { onSuccess: onCreated, onError: (error) => setErrors(getFieldErrors(error)) },
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {createProject.isError && (
        <div className="alert alert-error" role="alert">
          {getErrorMessage(createProject.error)}
        </div>
      )}
      <FormField label="Name" error={errors.name}>
        {(props) => <input {...props} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoFocus />}
      </FormField>
      <FormField label="Description" error={errors.description}>
        {(props) => (
          <textarea {...props} rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        )}
      </FormField>
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={createProject.isPending}>
          Create project
        </Button>
      </div>
    </form>
  );
};
