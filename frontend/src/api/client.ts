import axios from "axios";
import type { TodayFeed, IdeaDetail, IdeaSummary, SavedIdea, BuildOutput } from "./types";

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
};
