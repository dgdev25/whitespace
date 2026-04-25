import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { FeedPage } from "../FeedPage";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  http.get("/api/ideas/today", () => HttpResponse.json({
    date: "2026-04-25", papers_ingested: 3,
    ideas: [{ id: "1", title: "Hero Idea", description: "Desc", badge: "novel",
               novelty_score: 0.9, feasibility_score: 0.7, is_featured: true, paper_ids: ["a"], featured_date: "2026-04-25" }]
  }))
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("renders featured idea title", async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><MemoryRouter><FeedPage /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByText("Hero Idea")).toBeInTheDocument();
});
