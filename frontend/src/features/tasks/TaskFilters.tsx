import React from "react";
import type { TaskPriority, User } from "../../api/types";
import { Button } from "../../components/Button";
import { PRIORITIES, PRIORITY_LABELS } from "../../utils/taskLabels";
import { DEFAULT_FILTERS, type BoardFilters } from "./boardFilters";

interface TaskFiltersProps {
  filters: BoardFilters;
  users: User[];
  onChange: (filters: BoardFilters) => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({ filters, users, onChange }) => {
  const set = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => onChange({ ...filters, [key]: value });
  const isFiltered = filters.priority !== "" || filters.assigneeId !== "";

  return (
    <div className="filters" role="group" aria-label="Filter and sort tasks">
      <label>
        Priority
        <select value={filters.priority} onChange={(e) => set("priority", e.target.value as TaskPriority | "")}>
          <option value="">All</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Assignee
        <select value={filters.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
          <option value="">Anyone</option>
          {users.map((u) => (
            <option key={u.id} value={String(u.id)}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sort by
        <select value={filters.sort} onChange={(e) => set("sort", e.target.value as BoardFilters["sort"])}>
          <option value="dueDate">Due date</option>
          <option value="priority">Priority</option>
          <option value="createdAt">Created</option>
        </select>
      </label>
      <label>
        Order
        <select value={filters.direction} onChange={(e) => set("direction", e.target.value as BoardFilters["direction"])}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </label>
      {isFiltered && (
        <Button variant="ghost" onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort, direction: filters.direction })}>
          Clear filters
        </Button>
      )}
    </div>
  );
};
