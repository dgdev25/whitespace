import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export const useBuild = (ideaId: string) => useQuery({
  queryKey: ["build", ideaId],
  queryFn: () => api.getBuild(ideaId),
  retry: false,
  refetchInterval: (query) => query.state.data?.status === "generating" ? 2000 : false,
});

export const useGenerateBuild = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.triggerBuild,
    onSuccess: (_, ideaId) => qc.invalidateQueries({ queryKey: ["build", ideaId] }),
  });
};
