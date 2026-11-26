import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { PRIORITIES, PRIORITY_LABELS, type TaskPriority } from "@/entities/task";
import type { User } from "@/entities/user";
import { DEFAULT_FILTERS, type BoardFilters } from "../lib/boardFilters";

/** Wait this long after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;

interface TaskFiltersProps {
  filters: BoardFilters;
  users: User[];
  onChange: (filters: BoardFilters) => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({ filters, users, onChange }) => {
  const set = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => onChange({ ...filters, [key]: value });
  const isFiltered = filters.search.trim() !== "" || filters.priority !== "" || filters.assigneeId !== "";

  // The input updates immediately; the URL (and so the request) only after typing pauses.
  const [searchText, setSearchText] = useState(filters.search);
  const latest = useRef({ filters, onChange });
  latest.current = { filters, onChange };

  // Follow outside changes, e.g. "Clear filters" or browser back/forward.
  useEffect(() => setSearchText(filters.search), [filters.search]);

  useEffect(() => {
    if (searchText === latest.current.filters.search) return;
    const timer = window.setTimeout(
      () => latest.current.onChange({ ...latest.current.filters, search: searchText }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [searchText]);

  return (
    <div className="filters" role="group" aria-label="Filter and sort tasks">
      <label className="filters-search">
        Search
        <input
          type="search"
          placeholder="Title or task ID, e.g. #42"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </label>
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
