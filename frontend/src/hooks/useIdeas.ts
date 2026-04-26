import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";


export const useToday = () => useQuery({ queryKey: ["today"], queryFn: api.getTodayFeed });
export const useIdea = (id: string) => useQuery({ queryKey: ["idea", id], queryFn: () => api.getIdea(id) });
export const useRunners = () => useQuery({ queryKey: ["runners"], queryFn: api.getRunners, staleTime: 30_000 });
export const useSystemConfig = () => useQuery({ queryKey: ["config"], queryFn: api.getConfig, staleTime: 60_000 });
export const useSetDataSources = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgs, categories }: { orgs: string[]; categories: string[] }) =>
      api.setDataSources(orgs, categories),
    onSuccess: (data) => qc.setQueryData(["config"], data),
  });
};

export const useSetRunner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string | null) => api.setRunner(name),
    onSuccess: (data) => qc.setQueryData(["runners"], data),
  });
};

export const useHistory = () => useQuery({ queryKey: ["history"], queryFn: api.getHistory });
export const useSchedule = () => useQuery({ queryKey: ["schedule"], queryFn: api.getSchedule, staleTime: 10_000 });
export const useSetSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ enabled, interval_minutes }: { enabled: boolean; interval_minutes: number }) =>
      api.setSchedule(enabled, interval_minutes),
    onSuccess: (data) => qc.setQueryData(["schedule"], data),
  });
};

export const useSetRunnerModel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runner, model }: { runner: string; model: string | null }) =>
      api.setRunnerModel(runner, model),
    onSuccess: (data) => qc.setQueryData(["config"], data),
  });
};

export const useSetGithubRepos = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repos: string[]) => api.setGithubRepos(repos),
    onSuccess: (data) => qc.setQueryData(["config"], data),
  });
};

export const useSetPipelineConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ideas_per_run, max_sources_per_run, cached_analyses_count }: { ideas_per_run: number; max_sources_per_run: number; cached_analyses_count: number }) =>
      api.setPipelineConfig(ideas_per_run, max_sources_per_run, cached_analyses_count),
    onSuccess: (data) => qc.setQueryData(["config"], data),
  });
};

// Always polls every 8s so the NavBar always knows true pipeline state.
export const usePipelineStatus = () =>
  useQuery({
    queryKey: ["pipeline-status"],
    queryFn: api.getPipelineStatus,
    refetchInterval: 8000,
    staleTime: 0,
  });

export const useTriggerPipeline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.triggerPipeline,
    onSuccess: async (data) => {
      if (data.status === "already_running") {
        // Pipeline already running — start polling to catch completion
        qc.invalidateQueries({ queryKey: ["pipeline-status"] });
        return;
      }
      // Immediately mark as running in cache
      qc.setQueryData(["pipeline-status"], { running: true, last_completed_run_id: null, last_completed_at: null });
      qc.invalidateQueries({ queryKey: ["pipeline-status"] });
    },
  });
};
