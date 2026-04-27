import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import type { ApiResponse } from "./types/api";

const API_BASE_URL = "http://localhost:18730/api";

// Create MSW server for component tests
export const createMockServer = () =>
  setupServer(
    http.get(`${API_BASE_URL}/health`, () => {
      return HttpResponse.json<ApiResponse<{ status: string }>>({
        data: { status: "ok" },
        error: null,
        meta: {
          request_id: "test",
          timestamp: new Date().toISOString(),
        },
      });
    }),

    http.get(`${API_BASE_URL}/config`, () => {
      return HttpResponse.json<ApiResponse<any>>({
        data: {
          runner: "claude_cli",
          analysis_model: "claude-opus-4",
          synthesis_model: "claude-opus-4",
        },
        error: null,
        meta: {
          request_id: "test",
          timestamp: new Date().toISOString(),
        },
      });
    }),

    http.get(`${API_BASE_URL}/projects`, () => {
      return HttpResponse.json<ApiResponse<any>>({
        data: [
          {
            id: "proj-1",
            name: "Test Project 1",
            description: "First test project",
          },
        ],
        error: null,
        meta: {
          request_id: "test",
          timestamp: new Date().toISOString(),
          count: 1,
        },
      });
    }),

    http.post(`${API_BASE_URL}/projects`, async ({ request }) => {
      const body = (await request.json()) as {
        name: string;
        description?: string;
      };
      return HttpResponse.json<ApiResponse<any>>(
        {
          data: {
            id: "proj-new",
            name: body.name,
            description: body.description || null,
          },
          error: null,
          meta: {
            request_id: "test",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 201 }
      );
    }),

    http.get(`${API_BASE_URL}/projects/:id`, () => {
      return HttpResponse.json<ApiResponse<any>>({
        data: {
          id: "proj-1",
          name: "Test Project 1",
          description: "First test project",
        },
        error: null,
        meta: {
          request_id: "test",
          timestamp: new Date().toISOString(),
        },
      });
    }),

    http.patch(`${API_BASE_URL}/projects/:id`, async ({ request }) => {
      const body = (await request.json()) as {
        name?: string;
        description?: string;
      };
      return HttpResponse.json<ApiResponse<any>>({
        data: {
          id: "proj-1",
          name: body.name || "Test Project 1",
          description: body.description || "First test project",
        },
        error: null,
        meta: {
          request_id: "test",
          timestamp: new Date().toISOString(),
        },
      });
    }),

    http.delete(`${API_BASE_URL}/projects/:id`, () => {
      return HttpResponse.json<ApiResponse<any>>({
        data: { deleted: true },
        error: null,
        meta: {
          request_id: "test",
          timestamp: new Date().toISOString(),
        },
      });
    }),

    http.get(`${API_BASE_URL}/industries`, () => {
      return HttpResponse.json<ApiResponse<any>>({
        data: [
          {
            id: "ind-1",
            name: "Technology",
            description: "Tech sector",
          },
        ],
        error: null,
        meta: {
          request_id: "test",
          timestamp: new Date().toISOString(),
          count: 1,
        },
      });
    }),

    http.post(`${API_BASE_URL}/industries`, async ({ request }) => {
      const body = (await request.json()) as {
        name: string;
        description?: string;
      };
      return HttpResponse.json<ApiResponse<any>>(
        {
          data: {
            id: "ind-new",
            name: body.name,
            description: body.description || null,
          },
          error: null,
          meta: {
            request_id: "test",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 201 }
      );
    }),

    http.get(`${API_BASE_URL}/industries/:id`, () => {
      return HttpResponse.json<ApiResponse<any>>({
        data: {
          id: "ind-1",
          name: "Technology",
          description: "Tech sector",
        },
        error: null,
        meta: {
          request_id: "test",
          timestamp: new Date().toISOString(),
        },
      });
    }),

    http.patch(`${API_BASE_URL}/industries/:id`, async ({ request }) => {
      const body = (await request.json()) as {
        name?: string;
        description?: string;
      };
      return HttpResponse.json<ApiResponse<any>>({
        data: {
          id: "ind-1",
          name: body.name || "Technology",
          description: body.description || "Tech sector",
        },
        error: null,
        meta: {
          request_id: "test",
          timestamp: new Date().toISOString(),
        },
      });
    }),

    http.delete(`${API_BASE_URL}/industries/:id`, () => {
      return HttpResponse.json<ApiResponse<any>>({
        data: { deleted: true },
        error: null,
        meta: {
          request_id: "test",
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
