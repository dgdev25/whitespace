import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export const useSaved = () => useQuery({ queryKey: ["saved"], queryFn: api.getSaved });

export const useSaveIdea = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.saveIdea, onSuccess: () => qc.invalidateQueries({ queryKey: ["saved"] }) });
};

export const useUnsaveIdea = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.unsaveIdea, onSuccess: () => qc.invalidateQueries({ queryKey: ["saved"] }) });
};
