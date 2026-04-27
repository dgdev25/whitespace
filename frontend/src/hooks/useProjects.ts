import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { ProjectCreate } from "../api/types";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: () => api.listProjects() });
}

export function useProject(id: number) {
  return useQuery({ queryKey: ["project", id], queryFn: () => api.getProject(id), enabled: !!id });
}

export function useProjectIdeas(id: number) {
  return useQuery({ queryKey: ["project-ideas", id], queryFn: () => api.getProjectIdeas(id), enabled: !!id });
}

export function useProjectRuns(id: number) {
  return useQuery({ queryKey: ["project-runs", id], queryFn: () => api.getProjectRuns(id), enabled: !!id });
}

export function useProjectRunStatus(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["project-run-status", id],
    queryFn: () => api.getProjectRunStatus(id),
    refetchInterval: enabled ? 2000 : false,
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProjectCreate) => api.createProject(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useTriggerProjectRun(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.triggerProjectRun(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-run-status", id] });
      qc.invalidateQueries({ queryKey: ["project", id] });
    },
  });
}
