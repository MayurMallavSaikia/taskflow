import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../api/tasksApi";
import type { TaskPayload, TaskQuery, TaskStatus, UpdateTaskPayload } from "../api/types";
import { queryKeys } from "./queryKeys";

const PAGE_SIZE = 20;

/** One board column: tasks for a single status, loaded a page at a time. */
export function useColumnTasks(projectId: number, query: TaskQuery) {
  return useInfiniteQuery({
    queryKey: queryKeys.taskList(projectId, query),
    queryFn: ({ pageParam }) => tasksApi.list(projectId, { ...query, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined),
  });
}

export function useTaskActivity(taskId: number) {
  return useQuery({ queryKey: queryKeys.taskActivity(taskId), queryFn: () => tasksApi.activity(taskId) });
}

/** Tasks and summary both change whenever a task changes, so refresh both. */
function useInvalidateBoard(projectId: number) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.summary(projectId) }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    ]);
}

export function useCreateTask(projectId: number) {
  const invalidate = useInvalidateBoard(projectId);
  return useMutation({
    mutationFn: (payload: TaskPayload) => tasksApi.create(projectId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTask(projectId: number) {
  const invalidate = useInvalidateBoard(projectId);
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: UpdateTaskPayload }) =>
      tasksApi.update(taskId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTaskStatus(projectId: number) {
  const invalidate = useInvalidateBoard(projectId);
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) => tasksApi.updateStatus(taskId, status),
    onSettled: invalidate,
  });
}

export function useDeleteTask(projectId: number) {
  const invalidate = useInvalidateBoard(projectId);
  return useMutation({
    mutationFn: (taskId: number) => tasksApi.remove(taskId),
    onSuccess: invalidate,
  });
}
