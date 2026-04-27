import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import type { ArxivCategory, ArxivPaper } from "../types/api";

const ARXIV_CATEGORIES_QUERY_KEY = ["arxiv", "categories"];

export function useArxivCategories() {
  return useQuery<ArxivCategory[]>({
    queryKey: ARXIV_CATEGORIES_QUERY_KEY,
    queryFn: () => apiClient.arxiv.categories(),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export interface ArxivSearchParams {
  categories: string[];
  time_unit: "months" | "years";
  time_value: number;
  max_results: number;
}

export function useArxivSearch(params: ArxivSearchParams | null, enabled: boolean) {
  return useQuery<ArxivPaper[]>({
    queryKey: ["arxiv", "search", params],
    queryFn: () => {
      if (!params) {
        return Promise.resolve([]);
      }
      return apiClient.arxiv.search(params);
    },
    enabled: enabled && !!params,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
