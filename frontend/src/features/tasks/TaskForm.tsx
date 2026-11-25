import React, { useState } from "react";
import { getErrorMessage, getFieldErrors } from "../../api/errors";
import type { Task, TaskPriority, TaskStatus, User } from "../../api/types";
import { Button } from "../../components/Button";
import { FormField } from "../../components/FormField";
import { useCreateTask, useDeleteTask, useUpdateTask } from "../../hooks/useTasks";
import { todayIso } from "../../utils/dates";
import { PRIORITIES, PRIORITY_LABELS, STATUS_LABELS, STATUSES } from "../../utils/taskLabels";
import { TITLE_MAX_LENGTH, validateTaskForm, type TaskFormValues } from "./taskFormValidation";

interface TaskFormProps {
  projectId: number;
  users: User[];
  /** When set, the form edits this task; otherwise it creates a new one. */
  task?: Task;
  onDone: () => void;
}

function initialValues(task?: Task): TaskFormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "TODO",
    priority: task?.priority ?? "MEDIUM",
    dueDate: task?.dueDate ?? "",
    assigneeId: task?.assignee ? String(task.assignee.id) : "",
  };
}

export const TaskForm: React.FC<TaskFormProps> = ({ projectId, users, task, onDone }) => {
  const isEdit = task !== undefined;
  const [values, setValues] = useState<TaskFormValues>(() => initialValues(task));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const saveMutation = isEdit ? updateTask : createTask;
  const today = todayIso();

  const set =
    (field: keyof TaskFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateTaskForm(values, today, task?.dueDate ?? null);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      priority: values.priority,
      dueDate: values.dueDate || null,
      assigneeId: values.assigneeId ? Number(values.assigneeId) : null,
    };
    const options = { onSuccess: onDone, onError: (error: unknown) => setErrors(getFieldErrors(error)) };
    if (isEdit) {
      updateTask.mutate({ taskId: task.id, payload: { ...payload, status: values.status } }, options);
    } else {
      createTask.mutate(payload, options);
    }
  };

  const handleDelete = () => {
    if (task && window.confirm(`Delete "${task.title}"? This can't be undone.`)) {
      deleteTask.mutate(task.id, { onSuccess: onDone });
    }
  };

  const mutationError = saveMutation.error ?? deleteTask.error;

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={isEdit ? "Edit task" : "New task"}>
      {mutationError && (
        <div className="alert alert-error" role="alert">
          {getErrorMessage(mutationError)}
        </div>
      )}
      <FormField label="Title" error={errors.title}>
        {(props) => <input {...props} value={values.title} onChange={set("title")} maxLength={TITLE_MAX_LENGTH + 20} autoFocus />}
      </FormField>
      <FormField label="Description" error={errors.description}>
        {(props) => <textarea {...props} rows={3} value={values.description} onChange={set("description")} />}
      </FormField>
      <div className="form-row">
        {isEdit && (
          <FormField label="Status" error={errors.status}>
            {(props) => (
              <select {...props} value={values.status} onChange={set("status")}>
                {STATUSES.map((s: TaskStatus) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        )}
        <FormField label="Priority" error={errors.priority}>
          {(props) => (
            <select {...props} value={values.priority} onChange={set("priority")}>
              {PRIORITIES.map((p: TaskPriority) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="Due date" error={errors.dueDate}>
          {(props) => (
            <input
              {...props}
              type="date"
              min={isEdit && task.dueDate && task.dueDate < today ? undefined : today}
              value={values.dueDate}
              onChange={set("dueDate")}
            />
          )}
        </FormField>
        <FormField label="Assignee" error={errors.assigneeId}>
          {(props) => (
            <select {...props} value={values.assigneeId} onChange={set("assigneeId")}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>
      <div className="form-actions">
        {isEdit && (
          <Button variant="danger" onClick={handleDelete} loading={deleteTask.isPending} className="mr-auto">
            Delete
          </Button>
        )}
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saveMutation.isPending}>
          {isEdit ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
};
