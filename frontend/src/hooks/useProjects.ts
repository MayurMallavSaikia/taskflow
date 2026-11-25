import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projectsApi";
import type { ProjectPayload } from "../api/types";
import { queryKeys } from "./queryKeys";

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: projectsApi.list });
}

export function useProject(projectId: number) {
  return useQuery({ queryKey: queryKeys.project(projectId), queryFn: () => projectsApi.get(projectId) });
}

export function useProjectSummary(projectId: number) {
  return useQuery({ queryKey: queryKeys.summary(projectId), queryFn: () => projectsApi.summary(projectId) });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectPayload) => projectsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects, exact: true }),
  });
}
