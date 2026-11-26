import type { SortDirection, TaskPriority, TaskQuery } from "@/entities/task";

export interface BoardFilters {
  /** Task title or id ("42" / "#42"). */
  search: string;
  priority: TaskPriority | "";
  assigneeId: string;
  sort: NonNullable<TaskQuery["sort"]>;
  direction: SortDirection;
}

export const DEFAULT_FILTERS: BoardFilters = {
  search: "",
  priority: "",
  assigneeId: "",
  sort: "dueDate",
  direction: "asc",
};

const SORTS: BoardFilters["sort"][] = ["dueDate", "priority", "createdAt"];
const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

/** Filters live in the URL so a filtered board can be refreshed or shared. */
export function filtersFromParams(params: URLSearchParams): BoardFilters {
  const priority = params.get("priority") as TaskPriority | null;
  const sort = params.get("sort") as BoardFilters["sort"] | null;
  return {
    search: params.get("q") ?? "",
    priority: priority && PRIORITIES.includes(priority) ? priority : "",
    assigneeId: params.get("assignee") ?? "",
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
    direction: params.get("direction") === "desc" ? "desc" : "asc",
  };
}

export function filtersToParams(filters: BoardFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("q", filters.search);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assigneeId) params.set("assignee", filters.assigneeId);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.direction !== DEFAULT_FILTERS.direction) params.set("direction", filters.direction);
  return params;
}

export function filtersToQuery(filters: BoardFilters): TaskQuery {
  return {
    q: filters.search.trim() || undefined,
    priority: filters.priority || undefined,
    assigneeId: filters.assigneeId ? Number(filters.assigneeId) : undefined,
    sort: filters.sort,
    direction: filters.direction,
  };
}
