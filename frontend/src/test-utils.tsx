import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

// Create a fresh query client for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialRoute?: string;
  queryClient?: QueryClient;
}

// Custom render function with all necessary providers
export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = "/",
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  }

  // Set initial route if needed
  window.history.pushState({}, "Test page", initialRoute);

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient };
}

// Factory functions for common test data
export const createMockProject = (overrides = {}) => ({
  id: "test-project-1",
  name: "Test Project",
  description: "A test project",
  ...overrides,
});

export const createMockPaper = (overrides = {}) => ({
  id: "test-paper-1",
  title: "Test Paper Title",
  source_url: "https://arxiv.org/abs/1234.5678",
  source_type: "arxiv" as const,
  status: "success" as const,
  ...overrides,
});

export const createMockSession = (overrides = {}) => ({
  id: "test-session-1",
  status: "complete" as const,
  output_json_path: "/outputs/session-1.json",
  output_md_path: "/outputs/session-1.md",
  output_pdf_path: null,
  ...overrides,
});

export const createMockIndustry = (overrides = {}) => ({
  id: "test-industry-1",
  name: "Technology",
  description: "Tech sector",
  ...overrides,
});

export const createMockSystemConfig = (overrides = {}) => ({
  runner: "claude_cli",
  analysis_model: "claude-opus-4",
  synthesis_model: "claude-opus-4",
  max_categories: 3,
  ...overrides,
});

// Re-export everything from @testing-library/react for convenience
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
