import React, { useState } from "react";
import { getErrorMessage } from "@/shared/api/errors";
import { todayIso } from "@/shared/lib/dates";
import { useAppDispatch } from "@/shared/lib/redux";
import { useAsyncAction } from "@/shared/lib/useAsyncAction";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import {
  createTask,
  deleteTask,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUSES,
  updateTask,
  type Task,
  type TaskPayload,
  type TaskPriority,
  type TaskStatus,
} from "@/entities/task";
import type { User } from "@/entities/user";
import { TITLE_MAX_LENGTH, validateTaskForm, type TaskFormValues } from "../lib/taskFormValidation";

interface TaskFormProps {
  projectId: number;
  /** People the task can be assigned to (the project's members). */
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
  const dispatch = useAppDispatch();
  const isEdit = task !== undefined;
  const [values, setValues] = useState<TaskFormValues>(() => initialValues(task));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const today = todayIso();

  const save = useAsyncAction((payload: TaskPayload, status: TaskStatus) =>
    task
      ? dispatch(updateTask({ taskId: task.id, payload: { ...payload, status } })).unwrap()
      : dispatch(createTask({ projectId, payload })).unwrap(),
  );
  const remove = useAsyncAction((taskId: number) => dispatch(deleteTask({ taskId, projectId })).unwrap());

  const set =
    (field: keyof TaskFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateTaskForm(values, today, task?.dueDate ?? null);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const payload: TaskPayload = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      priority: values.priority,
      dueDate: values.dueDate || null,
      assigneeId: values.assigneeId ? Number(values.assigneeId) : null,
    };
    const result = await save.run(payload, values.status);
    if (result.ok) onDone();
    else setErrors(result.error.fieldErrors);
  };

  const handleDelete = async () => {
    if (task && window.confirm(`Delete "${task.title}"? This can't be undone.`)) {
      if ((await remove.run(task.id)).ok) onDone();
    }
  };

  const actionError = save.error ?? remove.error;

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={isEdit ? "Edit task" : "New task"}>
      {actionError && (
        <div className="alert alert-error" role="alert">
          {getErrorMessage(actionError)}
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
          <Button variant="danger" onClick={handleDelete} loading={remove.isPending} className="mr-auto">
            Delete
          </Button>
        )}
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {isEdit ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
};

