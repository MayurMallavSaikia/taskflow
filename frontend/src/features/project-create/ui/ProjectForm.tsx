import React, { useState } from "react";
import { getErrorMessage } from "@/shared/api/errors";
import { useAppDispatch } from "@/shared/lib/redux";
import { useAsyncAction } from "@/shared/lib/useAsyncAction";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { createProject, type Project, type ProjectPayload } from "@/entities/project";

interface ProjectFormProps {
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ onCreated, onCancel }) => {
  const dispatch = useAppDispatch();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useAsyncAction((payload: ProjectPayload) => dispatch(createProject(payload)).unwrap());

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }
    setErrors({});
    const result = await create.run({ name: name.trim(), description: description.trim() || undefined });
    if (result.ok) onCreated(result.value);
    else setErrors(result.error.fieldErrors);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {create.error && (
        <div className="alert alert-error" role="alert">
          {getErrorMessage(create.error)}
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
        <Button type="submit" loading={create.isPending}>
          Create project
        </Button>
      </div>
    </form>
  );
};

