import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const useToday = () => useQuery({ queryKey: ["today"], queryFn: api.getTodayFeed });
export const useIdea = (id: string) => useQuery({ queryKey: ["idea", id], queryFn: () => api.getIdea(id) });
