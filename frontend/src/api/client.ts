import axios from "axios";
import type { TodayFeed, IdeaDetail, IdeaSummary, SavedIdea, BuildOutput, RunnersResponse, SystemConfig, PipelineRunResponse, HistoryGroup, ScheduleStatus, OrgImportStatus, Project, ProjectCreate, ProjectIdea, ProjectRun, ProjectRunStatus } from "./types";

const http = axios.create({ baseURL: "/api" });

export const api = {
  getTodayFeed: (): Promise<TodayFeed> => http.get("/ideas/today").then(r => r.data),
  getIdea: (id: string): Promise<IdeaDetail> => http.get(`/ideas/${id}`).then(r => r.data),
  getSurprise: (): Promise<IdeaSummary> => http.get("/ideas/surprise").then(r => r.data),
  getSaved: (): Promise<SavedIdea[]> => http.get("/saved/").then(r => r.data),
  saveIdea: (id: string): Promise<SavedIdea> =>
    http.post("/saved/", { idea_id: id }).then(r => r.data),
  unsaveIdea: (id: string): Promise<void> => http.delete(`/saved/${id}`).then(() => undefined),
  getBuild: (id: string): Promise<BuildOutput> => http.get(`/build/${id}`).then(r => r.data),
  triggerBuild: (id: string): Promise<BuildOutput> => http.post(`/build/${id}`).then(r => r.data),
  getRunners: (): Promise<RunnersResponse> => http.get("/system/runners").then(r => r.data),
  setRunner: (name: string | null): Promise<RunnersResponse> => http.put("/system/runner", { name }).then(r => r.data),
  getConfig: (): Promise<SystemConfig> => http.get("/system/config").then(r => r.data),
  setDataSources: (orgs: string[], categories: string[]): Promise<SystemConfig> =>
    http.put("/system/data-sources", { orgs, categories }).then(r => r.data),
  triggerPipeline: (): Promise<PipelineRunResponse> => http.post("/system/pipeline/run").then(r => r.data),
  getPipelineStatus: (): Promise<{ running: boolean; last_completed_run_id: string | null; last_completed_at: string | null }> =>
    http.get("/system/pipeline/status").then(r => r.data),
  getHistory: (): Promise<HistoryGroup[]> => http.get("/ideas/history").then(r => r.data),
  getSchedule: (): Promise<ScheduleStatus> => http.get("/system/schedule").then(r => r.data),
  setSchedule: (enabled: boolean, interval_minutes: number): Promise<ScheduleStatus> =>
    http.put("/system/schedule", { enabled, interval_minutes }).then(r => r.data),
  setPipelineConfig: (ideas_per_run: number, max_sources_per_run: number, cached_analyses_count: number): Promise<SystemConfig> =>
    http.put("/system/pipeline-config", { ideas_per_run, max_sources_per_run, cached_analyses_count }).then(r => r.data),
  setRunnerModel: (runner: string, model: string | null): Promise<SystemConfig> =>
    http.put("/system/runner-model", { runner, model }).then(r => r.data),
  setGithubRepos: (repos: string[]): Promise<SystemConfig> =>
    http.put("/system/github-repos", { repos }).then(r => r.data),
  toggleSource: (source: string, enabled: boolean): Promise<SystemConfig> =>
    http.put("/system/sources/toggle", { source, enabled }).then(r => r.data),
  importOrg: (handle: string): Promise<OrgImportStatus> =>
    http.post("/system/github-repos/import-org", { handle }).then(r => r.data),
  getOrgImportStatus: (): Promise<OrgImportStatus> =>
    http.get("/system/github-repos/import-org/status").then(r => r.data),
  listProjects: (): Promise<Project[]> => http.get("/projects").then(r => r.data),
  createProject: (data: ProjectCreate): Promise<Project> => http.post("/projects", data).then(r => r.data),
  getProject: (id: number): Promise<Project> => http.get(`/projects/${id}`).then(r => r.data),
  updateProject: (id: number, data: Partial<ProjectCreate>): Promise<Project> => http.put(`/projects/${id}`, data).then(r => r.data),
  deleteProject: (id: number): Promise<void> => http.delete(`/projects/${id}`).then(() => undefined),
  getProjectIdeas: (id: number): Promise<ProjectIdea[]> => http.get(`/projects/${id}/ideas`).then(r => r.data),
  getProjectIdea: (projectId: number, ideaId: string): Promise<ProjectIdea> => http.get(`/projects/${projectId}/ideas/${ideaId}`).then(r => r.data),
  generateProjectIdeaPrd: (projectId: number, ideaId: string): Promise<{ prd: string }> => http.post(`/projects/${projectId}/ideas/${ideaId}/prd`).then(r => r.data),
  getProjectRuns: (id: number): Promise<ProjectRun[]> => http.get(`/projects/${id}/runs`).then(r => r.data),
  triggerProjectRun: (id: number): Promise<ProjectRunStatus> => http.post(`/projects/${id}/run`).then(r => r.data),
  getProjectRunStatus: (id: number): Promise<ProjectRunStatus> => http.get(`/projects/${id}/run/status`).then(r => r.data),
};
