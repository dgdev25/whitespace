# Whitespace v2 — Plan 4: Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete React/Vite frontend — all 4 screens (Feed, Idea Detail, Build Output, Saved Collection), light/dark mode toggle, React Query data fetching, and Zustand theme state. The result is a fully functional UI connected to the live API.

**Architecture:** React 18 + Vite + TypeScript. React Query for server state (ideas, saved, build). Zustand for UI state (theme). CSS custom properties for light/dark tokens — no CSS-in-JS library. IBM Plex Sans font. Routes via React Router v6.

**Tech Stack:** React 18, Vite, TypeScript strict, React Query v5, Zustand, React Router v6, Vitest, React Testing Library, MSW (API mocking in tests)

**Prerequisite:** Plans 1–3 complete. Backend API running on `http://localhost:18730`.

---

## File Map

```
whitespace/frontend/src/
├── styles/
│   ├── tokens.css        — CSS custom properties (light + dark)
│   └── global.css        — reset + base typography
├── api/
│   ├── client.ts         — axios instance
│   └── types.ts          — shared TypeScript types
├── store/
│   └── themeStore.ts     — Zustand: theme preference
├── hooks/
│   ├── useIdeas.ts       — useToday, useIdea, useSurprise
│   ├── useSaved.ts       — useSaved, useSaveIdea, useUnsaveIdea
│   └── useBuild.ts       — useBuild, useGenerateBuild
├── components/
│   ├── NavBar.tsx
│   ├── BadgeRow.tsx
│   ├── HeroCard.tsx
│   ├── IdeaCard.tsx
│   ├── ConnectedIdeas.tsx
│   ├── ProductSketch.tsx
│   └── TechnicalPlan.tsx
├── pages/
│   ├── FeedPage.tsx
│   ├── IdeaDetailPage.tsx
│   ├── BuildOutputPage.tsx
│   ├── SavedPage.tsx
│   └── SettingsPage.tsx
├── App.tsx
└── main.tsx
```

---

## Task 20: Vite project bootstrap

**Files:** `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/index.html`

- [ ] **Scaffold with Vite**

```bash
cd whitespace
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

- [ ] **Install additional dependencies**

```bash
npm install @tanstack/react-query zustand react-router-dom axios @fontsource/ibm-plex-sans
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom msw
```

- [ ] **Update `vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 18731, proxy: { "/api": "http://localhost:18730" } },
  test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"], globals: true },
});
```

- [ ] **Create `vitest.setup.ts`**

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Update `tsconfig.json`** to enable strict mode

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vitest.setup.ts"]
}
```

- [ ] **Verify dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:18731` loads the default Vite page.

- [ ] **Commit**

```bash
git add frontend/
git commit -m "chore: scaffold React/Vite/TypeScript frontend"
```

---

## Task 21: CSS tokens and global styles

**Files:** `src/styles/tokens.css`, `src/styles/global.css`

- [ ] **Create `src/styles/tokens.css`**

```css
:root {
  --bg: #f7f7f5;
  --surface: #ffffff;
  --border: #e5e5e0;
  --text-primary: #111111;
  --text-secondary: #555555;
  --text-muted: #aaaaaa;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --badge-novel-bg: #dcfce7;
  --badge-novel-text: #16a34a;
  --badge-feasible-bg: #dbeafe;
  --badge-feasible-text: #2563eb;
  --badge-speculative-bg: #fef9c3;
  --badge-speculative-text: #a16207;
  --badge-emerging-bg: #ffedd5;
  --badge-emerging-text: #ea580c;
  --risk-bg: #fff7ed;
  --risk-border: #ea580c;
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
  --radius: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.08);
}

[data-theme="dark"] {
  --bg: #0a0a0a;
  --surface: #111111;
  --border: #1e1e1e;
  --text-primary: #f0f0f0;
  --text-secondary: #aaaaaa;
  --text-muted: #555555;
  --accent: #7c9ef0;
  --accent-hover: #93aef5;
  --badge-novel-bg: #1a2a1a;
  --badge-novel-text: #4caf50;
  --badge-feasible-bg: #1a1a2a;
  --badge-feasible-text: #7c9ef0;
  --badge-speculative-bg: #2a2a1a;
  --badge-speculative-text: #d4af37;
  --badge-emerging-bg: #2a1a1a;
  --badge-emerging-text: #f97316;
  --risk-bg: #1a1010;
  --risk-border: #f97316;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.4);
}
```

- [ ] **Create `src/styles/global.css`**

```css
@import "./tokens.css";
@import "@fontsource/ibm-plex-sans/400.css";
@import "@fontsource/ibm-plex-sans/600.css";
@import "@fontsource/ibm-plex-sans/700.css";

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text-primary);
  line-height: 1.5;
  transition: background 0.2s, color 0.2s;
}

a { color: var(--accent); text-decoration: none; }
button { cursor: pointer; font-family: inherit; }
```

- [ ] **Import in `src/main.tsx`**

```typescript
import "./styles/global.css";
```

- [ ] **Commit**

```bash
git add src/styles/ src/main.tsx
git commit -m "feat: add CSS design tokens for light and dark mode"
```

---

## Task 22: API types and client

**Files:** `src/api/types.ts`, `src/api/client.ts`

- [ ] **Create `src/api/types.ts`**

```typescript
export interface ConnectedIdea {
  id: string;
  title: string;
  badge: Badge;
  shared_paper_count: number;
}

export type Badge = "novel" | "feasible" | "speculative" | "emerging";

export interface IdeaSummary {
  id: string;
  title: string;
  description: string;
  badge: Badge;
  novelty_score: number;
  feasibility_score: number;
  is_featured: boolean;
  paper_ids: string[];
  featured_date: string | null;
}

export interface IdeaDetail extends IdeaSummary {
  why_novel: string;
  who_builds: string;
  who_buys: string;
  connections: ConnectedIdea[];
  created_at: string;
}

export interface TodayFeed {
  date: string;
  papers_ingested: number;
  ideas: IdeaSummary[];
}

export interface SavedIdea {
  id: string;
  idea: IdeaSummary;
  saved_at: string;
  has_build_output: boolean;
}

export interface Risk { title: string; description: string; }
export interface MonetisationPattern { name: string; description: string; fit: string; }

export interface ProductSketch {
  value_prop_headline: string;
  value_prop_body: string;
  buyer_profile: string;
  buyer_signals: string[];
  risks: Risk[];
  monetisation: MonetisationPattern[];
  caveat: string;
}

export interface BuildOutput {
  id: string;
  idea_id: string;
  product_sketch: ProductSketch;
  technical_plan: string;
  status: "pending" | "generating" | "ready" | "failed";
  created_at: string;
}
```

- [ ] **Create `src/api/client.ts`**

```typescript
import axios from "axios";
import type { TodayFeed, IdeaDetail, IdeaSummary, SavedIdea, BuildOutput } from "./types";

const http = axios.create({ baseURL: "/api" });

export const api = {
  getTodayFeed: (): Promise<TodayFeed> => http.get("/ideas/today").then(r => r.data),
  getIdea: (id: string): Promise<IdeaDetail> => http.get(`/ideas/${id}`).then(r => r.data),
  getSurprise: (): Promise<IdeaSummary> => http.get("/ideas/surprise").then(r => r.data),
  getSaved: (): Promise<SavedIdea[]> => http.get("/saved/").then(r => r.data),
  saveIdea: (id: string): Promise<SavedIdea> => http.post(`/saved/${id}`).then(r => r.data),
  unsaveIdea: (id: string): Promise<void> => http.delete(`/saved/${id}`).then(() => undefined),
  getBuild: (id: string): Promise<BuildOutput> => http.get(`/build/${id}`).then(r => r.data),
  triggerBuild: (id: string): Promise<BuildOutput> => http.post(`/build/${id}`).then(r => r.data),
};
```

- [ ] **Commit**

```bash
git add src/api/
git commit -m "feat: add TypeScript API types and client"
```

---

## Task 23: Theme store and React Query setup

**Files:** `src/store/themeStore.ts`, `src/App.tsx`, `src/main.tsx`

- [ ] **Create `src/store/themeStore.ts`**

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggle: () => {
        const next = get().theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", next);
        set({ theme: next });
      },
    }),
    { name: "whitespace-theme" }
  )
);

// Apply persisted theme on load
const stored = JSON.parse(localStorage.getItem("whitespace-theme") ?? "{}");
if (stored?.state?.theme) {
  document.documentElement.setAttribute("data-theme", stored.state.theme);
}
```

- [ ] **Update `src/main.tsx`**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles/global.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Commit**

```bash
git add src/store/ src/main.tsx
git commit -m "feat: add Zustand theme store and React Query provider"
```

---

## Task 24: Shared components

**Files:** `src/components/NavBar.tsx`, `src/components/BadgeRow.tsx`

- [ ] **Create `src/components/BadgeRow.tsx`**

```typescript
import type { Badge } from "../api/types";

const BADGE_LABELS: Record<Badge, string> = {
  novel: "NOVEL",
  feasible: "FEASIBLE",
  speculative: "SPECULATIVE",
  emerging: "EMERGING",
};

export function BadgeRow({ badges }: { badges: Badge[] }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {badges.map(b => (
        <span key={b} style={{
          background: `var(--badge-${b}-bg)`,
          color: `var(--badge-${b}-text)`,
          fontSize: 8,
          fontWeight: 700,
          padding: "2px 7px",
          borderRadius: 3,
          letterSpacing: ".5px",
        }}>
          {BADGE_LABELS[b]}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Create `src/components/NavBar.tsx`**

```typescript
import { Link, useLocation } from "react-router-dom";
import { useThemeStore } from "../store/themeStore";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export function NavBar() {
  const { theme, toggle } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSurprise = async () => {
    try {
      const idea = await api.getSurprise();
      navigate(`/ideas/${idea.id}`);
    } catch {}
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav style={{
      background: "var(--surface)", borderBottom: "1px solid var(--border)",
      padding: "0 20px", display: "flex", alignItems: "center", height: 44, position: "sticky", top: 0, zIndex: 10,
    }}>
      <Link to="/" style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>
        Whitespace
      </Link>
      <div style={{ marginLeft: 28, display: "flex" }}>
        {[["Ideas", "/"], ["Saved", "/saved"], ["Settings", "/settings"]].map(([label, path]) => (
          <Link key={path} to={path} style={{
            padding: "0 12px", height: 44, display: "flex", alignItems: "center",
            fontSize: 10, fontWeight: isActive(path as string) ? 700 : 400,
            color: isActive(path as string) ? "var(--text-primary)" : "var(--text-muted)",
            borderBottom: isActive(path as string) ? "2px solid var(--text-primary)" : "2px solid transparent",
          }}>
            {label}
          </Link>
        ))}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button onClick={toggle} style={{
          background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)",
          fontSize: 9, padding: "5px 12px", borderRadius: 4, fontWeight: 500,
        }}>
          {theme === "light" ? "☾ Dark" : "☀ Light"}
        </button>
        <button onClick={handleSurprise} style={{
          background: "var(--text-primary)", border: "none", color: "var(--bg)",
          fontSize: 9, padding: "5px 12px", borderRadius: 4, fontWeight: 600,
        }}>
          ↻ Surprise me
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Write test** `src/components/__tests__/BadgeRow.test.tsx`

```typescript
import { render, screen } from "@testing-library/react";
import { BadgeRow } from "../BadgeRow";

test("renders badge labels", () => {
  render(<BadgeRow badges={["novel", "feasible"]} />);
  expect(screen.getByText("NOVEL")).toBeInTheDocument();
  expect(screen.getByText("FEASIBLE")).toBeInTheDocument();
});
```

- [ ] **Run test**

```bash
npm test -- --run
```

Expected: PASS.

- [ ] **Commit**

```bash
git add src/components/ src/components/__tests__/
git commit -m "feat: add NavBar and BadgeRow components"
```

---

## Task 25: Feed page

**Files:** `src/hooks/useIdeas.ts`, `src/components/HeroCard.tsx`, `src/components/IdeaCard.tsx`, `src/pages/FeedPage.tsx`

- [ ] **Create `src/hooks/useIdeas.ts`**

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../api/client";

export const useToday = () => useQuery({ queryKey: ["today"], queryFn: api.getTodayFeed });
export const useIdea = (id: string) => useQuery({ queryKey: ["idea", id], queryFn: () => api.getIdea(id) });
```

- [ ] **Create `src/components/HeroCard.tsx`**

```typescript
import { useNavigate } from "react-router-dom";
import type { IdeaSummary } from "../api/types";
import { BadgeRow } from "./BadgeRow";

export function HeroCard({ idea }: { idea: IdeaSummary }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
      padding: 20, boxShadow: "var(--shadow-sm)", position: "relative",
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0, background: "var(--badge-feasible-bg)",
        color: "var(--badge-feasible-text)", fontSize: 8, fontWeight: 700,
        padding: "5px 10px", borderRadius: "0 10px 0 6px", letterSpacing: 1,
      }}>
        FEATURED TODAY
      </div>
      <div style={{ marginBottom: 10, paddingRight: 80 }}>
        <BadgeRow badges={[idea.badge, ...(idea.novelty_score > 0.7 ? ["novel" as const] : [])]} />
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.3 }}>
        {idea.title}
      </h2>
      <p style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 14 }}>
        {idea.description}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
          From {idea.paper_ids.length} paper{idea.paper_ids.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate(`/ideas/${idea.id}`)} style={{
            background: "var(--text-primary)", border: "none", color: "var(--bg)",
            fontSize: 9, padding: "5px 14px", borderRadius: 4, fontWeight: 500,
          }}>
            Explore →
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Create `src/components/IdeaCard.tsx`**

```typescript
import { useNavigate } from "react-router-dom";
import type { IdeaSummary } from "../api/types";
import { BadgeRow } from "./BadgeRow";

export function IdeaCard({ idea }: { idea: IdeaSummary }) {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(`/ideas/${idea.id}`)} style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
      padding: 14, cursor: "pointer", transition: "box-shadow 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ marginBottom: 8 }}><BadgeRow badges={[idea.badge]} /></div>
      <h3 style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 6 }}>
        {idea.title}
      </h3>
      <p style={{ fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
        {idea.description}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{idea.paper_ids.length} paper{idea.paper_ids.length !== 1 ? "s" : ""}</span>
        <span style={{ fontSize: 9, color: "var(--accent)", fontWeight: 600 }}>Explore →</span>
      </div>
    </div>
  );
}
```

- [ ] **Create `src/pages/FeedPage.tsx`**

```typescript
import { useToday } from "../hooks/useIdeas";
import { HeroCard } from "../components/HeroCard";
import { IdeaCard } from "../components/IdeaCard";

export function FeedPage() {
  const { data, isLoading, error } = useToday();

  if (isLoading) return <p style={{ padding: 20, color: "var(--text-muted)" }}>Loading today's ideas...</p>;
  if (error) return <p style={{ padding: 20, color: "var(--badge-emerging-text)" }}>Failed to load feed.</p>;
  if (!data || data.ideas.length === 0) return (
    <div style={{ padding: 20 }}>
      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>No ideas yet — the worker runs at 02:00 or on first start.</p>
    </div>
  );

  const [featured, ...rest] = data.ideas;

  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ padding: "16px 0 10px", display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5 }}>
          {new Date(data.date).toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          · {data.ideas.length} ideas from {data.papers_ingested} new papers
        </span>
      </div>
      <div style={{ marginBottom: 14 }}><HeroCard idea={featured} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {rest.map(idea => <IdeaCard key={idea.id} idea={idea} />)}
      </div>
    </div>
  );
}
```

- [ ] **Write test** `src/pages/__tests__/FeedPage.test.tsx`

```typescript
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
```

- [ ] **Run tests**

```bash
npm test -- --run
```

Expected: all PASS.

- [ ] **Commit**

```bash
git add src/
git commit -m "feat: add Feed page with HeroCard and IdeaCard"
```

---

## Task 26: Idea detail page

**Files:** `src/components/ConnectedIdeas.tsx`, `src/pages/IdeaDetailPage.tsx`, `src/hooks/useSaved.ts`

- [ ] **Create `src/hooks/useSaved.ts`**

```typescript
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
```

- [ ] **Create `src/components/ConnectedIdeas.tsx`**

```typescript
import { useNavigate } from "react-router-dom";
import type { ConnectedIdea } from "../api/types";

const DOT_COLOR: Record<string, string> = {
  novel: "var(--badge-novel-text)", feasible: "var(--badge-feasible-text)",
  speculative: "var(--badge-speculative-text)", emerging: "var(--badge-emerging-text)",
};

export function ConnectedIdeas({ ideas }: { ideas: ConnectedIdea[] }) {
  const navigate = useNavigate();
  if (ideas.length === 0) return null;
  return (
    <div>
      <p style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 8 }}>CONNECTED IDEAS</p>
      <p style={{ fontSize: 8, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
        Other concepts from the same research threads
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ideas.map(c => (
          <div key={c.id} onClick={() => navigate(`/ideas/${c.id}`)} style={{
            background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4,
            padding: 8, cursor: "pointer",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: DOT_COLOR[c.badge] ?? "var(--text-muted)", flexShrink: 0 }} />
              <span style={{ color: "var(--text-secondary)", fontSize: 9, fontWeight: 600 }}>{c.title}</span>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: 8, paddingLeft: 10 }}>shares {c.shared_paper_count} paper{c.shared_paper_count !== 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Create `src/pages/IdeaDetailPage.tsx`**

```typescript
import { useParams, useNavigate } from "react-router-dom";
import { useIdea } from "../hooks/useIdeas";
import { useSaveIdea, useUnsaveIdea, useSaved } from "../hooks/useSaved";
import { BadgeRow } from "../components/BadgeRow";
import { ConnectedIdeas } from "../components/ConnectedIdeas";

export function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: idea, isLoading } = useIdea(id!);
  const { data: saved } = useSaved();
  const saveIdea = useSaveIdea();
  const unsaveIdea = useUnsaveIdea();

  if (isLoading) return <p style={{ padding: 20, color: "var(--text-muted)" }}>Loading...</p>;
  if (!idea) return <p style={{ padding: 20 }}>Idea not found.</p>;

  const isSaved = saved?.some(s => s.idea.id === id);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", minHeight: "calc(100vh - 44px)" }}>
      <div style={{ padding: 20, borderRight: "1px solid var(--border)", overflow: "auto" }}>
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 10, padding: 0 }}>
            ← Back
          </button>
        </div>
        <div style={{ marginBottom: 10 }}><BadgeRow badges={[idea.badge]} /></div>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 10 }}>{idea.title}</h1>
        <p style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>{idea.description}</p>

        <Section label="WHY THIS IS NOVEL" color="var(--accent)">
          <p style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.6 }}>{idea.why_novel}</p>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <InfoBox label="WHO BUILDS THIS" value={idea.who_builds} />
          <InfoBox label="WHO BUYS IT" value={idea.who_buys} />
        </div>

        <Section label={`RESEARCH BASIS — ${idea.paper_ids.length} PAPERS`} color="var(--text-muted)">
          {idea.paper_ids.map(pid => (
            <div key={pid} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: 8, marginBottom: 6, fontSize: 9, color: "var(--text-secondary)" }}>
              {pid}
            </div>
          ))}
        </Section>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={() => isSaved ? unsaveIdea.mutate(id!) : saveIdea.mutate(id!)} style={{
            background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)",
            fontSize: 9, padding: "6px 14px", borderRadius: 4,
          }}>
            {isSaved ? "Saved ✓" : "Save"}
          </button>
          <button onClick={() => navigate(`/ideas/${id}/build`)} style={{
            background: "var(--text-primary)", border: "none", color: "var(--bg)",
            fontSize: 9, padding: "6px 14px", borderRadius: 4, fontWeight: 600,
          }}>
            Build Plan →
          </button>
        </div>
      </div>

      <div style={{ padding: 16, background: "var(--bg)", overflow: "auto" }}>
        <ConnectedIdeas ideas={idea.connections} />
        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <button onClick={() => navigate("/ideas/surprise")} style={{
            width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
            color: "var(--text-muted)", fontSize: 9, padding: 8, borderRadius: 4,
          }}>
            ↻ Surprise me
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 9, color, letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {children}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: 10 }}>
      <p style={{ fontSize: 8, color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.5 }}>{value}</p>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/
git commit -m "feat: add Idea Detail page with connections and save/build CTAs"
```

---

## Task 27: Build output page

**Files:** `src/hooks/useBuild.ts`, `src/components/ProductSketch.tsx`, `src/pages/BuildOutputPage.tsx`

- [ ] **Create `src/hooks/useBuild.ts`**

```typescript
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
```

- [ ] **Create `src/components/ProductSketch.tsx`**

```typescript
import type { ProductSketch as PS } from "../api/types";

export function ProductSketch({ sketch }: { sketch: PS }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, minHeight: 340 }}>
      <div style={{ padding: 18, borderRight: "1px solid var(--border)" }}>
        <SketchSection label="VALUE PROPOSITION" color="var(--accent)">
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{sketch.value_prop_headline}</p>
          <p style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.7 }}>{sketch.value_prop_body}</p>
        </SketchSection>
        <SketchSection label="LIKELY BUYER" color="var(--badge-novel-text)">
          <div style={{ background: "var(--badge-novel-bg)", border: "1px solid var(--badge-novel-text)33", borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--badge-novel-text)", marginBottom: 6 }}>{sketch.buyer_profile}</p>
            <ul style={{ fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: 14 }}>
              {sketch.buyer_signals.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </SketchSection>
        <SketchSection label="KEY RISKS" color="var(--badge-emerging-text)">
          {sketch.risks.map((r, i) => (
            <div key={i} style={{ background: "var(--risk-bg)", borderLeft: `3px solid var(--risk-border)`, padding: "7px 10px", borderRadius: "0 4px 4px 0", marginBottom: 6 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{r.title}</p>
              <p style={{ fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.5 }}>{r.description}</p>
            </div>
          ))}
        </SketchSection>
      </div>
      <div style={{ padding: 18 }}>
        <SketchSection label="MONETISATION PATTERNS" color="#7c3aed">
          <p style={{ fontSize: 8, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>Three plausible models — hypotheses to validate, not conclusions</p>
          {sketch.monetisation.map((m, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: 12, marginBottom: 8, boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>{m.name}</p>
                {m.fit === "Strongest fit" && <span style={{ background: "var(--badge-feasible-bg)", color: "var(--badge-feasible-text)", fontSize: 8, padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>{m.fit}</span>}
              </div>
              <p style={{ fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.6 }}>{m.description}</p>
            </div>
          ))}
          <div style={{ background: "var(--bg)", border: "1px dashed var(--border)", borderRadius: 5, padding: 10, marginTop: 8 }}>
            <p style={{ fontSize: 8, color: "var(--text-muted)", lineHeight: 1.7 }}>⚠ {sketch.caveat}</p>
          </div>
        </SketchSection>
      </div>
    </div>
  );
}

function SketchSection({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 9, color, letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {children}
    </div>
  );
}
```

- [ ] **Create `src/pages/BuildOutputPage.tsx`**

```typescript
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBuild, useGenerateBuild } from "../hooks/useBuild";
import { useIdea } from "../hooks/useIdeas";
import { ProductSketch } from "../components/ProductSketch";

export function BuildOutputPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"sketch" | "plan">("sketch");
  const { data: idea } = useIdea(id!);
  const { data: build, isLoading, isError } = useBuild(id!);
  const generate = useGenerateBuild();

  const handleGenerate = () => generate.mutate(id!);

  const tabStyle = (t: string) => ({
    padding: "9px 14px", fontSize: 10, cursor: "pointer", fontWeight: tab === t ? 600 : 400,
    color: tab === t ? "var(--accent)" : "var(--text-muted)",
    borderBottom: tab === t ? `2px solid var(--accent)` : "2px solid transparent",
    background: "none", border: "none", borderBottom: tab === t ? `2px solid var(--accent)` : "2px solid transparent",
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => navigate(`/ideas/${id}`)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 10 }}>← Back to idea</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a href={`/api/export/${id}/markdown`} download style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 9, padding: "4px 10px", borderRadius: 4 }}>Export MD</a>
          <a href={`/api/export/${id}/pdf`} download style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 9, padding: "4px 10px", borderRadius: 4 }}>Export PDF</a>
        </div>
      </div>

      {idea && (
        <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "12px 16px" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{idea.title}</h2>
        </div>
      )}

      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 16px" }}>
        <button style={tabStyle("sketch")} onClick={() => setTab("sketch")}>PRODUCT SKETCH</button>
        <button style={tabStyle("plan")} onClick={() => setTab("plan")}>TECHNICAL PLAN</button>
      </div>

      {isLoading && <p style={{ padding: 20, color: "var(--text-muted)" }}>Loading...</p>}

      {isError && !generate.isPending && (
        <div style={{ padding: 20 }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 12 }}>No build plan yet.</p>
          <button onClick={handleGenerate} style={{ background: "var(--text-primary)", border: "none", color: "var(--bg)", fontSize: 10, padding: "8px 16px", borderRadius: 4 }}>
            Generate Build Plan
          </button>
        </div>
      )}

      {build?.status === "generating" && (
        <p style={{ padding: 20, color: "var(--text-muted)" }}>Generating — this takes 30–120 seconds...</p>
      )}

      {build?.status === "ready" && tab === "sketch" && <ProductSketch sketch={build.product_sketch} />}

      {build?.status === "ready" && tab === "plan" && (
        <div style={{ padding: 20, fontSize: 11, color: "var(--text-primary)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
          {build.technical_plan}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/
git commit -m "feat: add Build Output page with Product Sketch and Technical Plan tabs"
```

---

## Task 28: Saved collection page

**Files:** `src/pages/SavedPage.tsx`

- [ ] **Create `src/pages/SavedPage.tsx`**

```typescript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSaved, useUnsaveIdea } from "../hooks/useSaved";
import { BadgeRow } from "../components/BadgeRow";

type Filter = "all" | "built" | "unexplored";

export function SavedPage() {
  const { data: saved, isLoading } = useSaved();
  const unsave = useUnsaveIdea();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");

  if (isLoading) return <p style={{ padding: 20, color: "var(--text-muted)" }}>Loading...</p>;

  const filtered = (saved ?? []).filter(s => {
    if (filter === "built") return s.has_build_output;
    if (filter === "unexplored") return !s.has_build_output;
    return true;
  });

  const filterBtn = (f: Filter, label: string) => (
    <button onClick={() => setFilter(f)} style={{
      background: filter === f ? "var(--surface)" : "transparent",
      border: "1px solid var(--border)", color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
      fontSize: 9, padding: "4px 10px", borderRadius: 4, fontWeight: filter === f ? 600 : 400,
    }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ padding: "16px 0 12px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5 }}>SAVED IDEAS</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 10 }}>
            {filtered.length} idea{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {filterBtn("all", "All")}
          {filterBtn("built", "Built")}
          {filterBtn("unexplored", "Unexplored")}
        </div>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: 10 }}>
          {filter === "all" ? "No saved ideas yet — explore the feed and save what interests you." : "No ideas in this filter."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(s => (
          <div key={s.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, display: "flex", alignItems: "flex-start", gap: 14, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 7, alignItems: "center" }}>
                <BadgeRow badges={[s.idea.badge]} />
                {s.has_build_output && (
                  <span style={{ background: "var(--badge-novel-bg)", color: "var(--badge-novel-text)", fontSize: 7, padding: "1px 6px", borderRadius: 2, fontWeight: 600, border: "1px solid var(--badge-novel-text)44" }}>
                    ✓ BUILD PLAN READY
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{s.idea.title}</p>
              <p style={{ fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.6 }}>{s.idea.description}</p>
              <p style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 6 }}>
                Saved {new Date(s.saved_at).toLocaleDateString()} · {s.idea.paper_ids.length} paper{s.idea.paper_ids.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
              {s.has_build_output
                ? <button onClick={() => navigate(`/ideas/${s.idea.id}/build`)} style={{ background: "var(--text-primary)", border: "none", color: "var(--bg)", fontSize: 8, padding: "5px 12px", borderRadius: 4, fontWeight: 600 }}>View Plan →</button>
                : <button onClick={() => navigate(`/ideas/${s.idea.id}/build`)} style={{ background: "var(--text-primary)", border: "none", color: "var(--bg)", fontSize: 8, padding: "5px 12px", borderRadius: 4, fontWeight: 600 }}>Build Plan →</button>
              }
              <button onClick={() => navigate(`/ideas/${s.idea.id}`)} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 8, padding: "5px 12px", borderRadius: 4 }}>Explore</button>
              <button onClick={() => unsave.mutate(s.idea.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 8, padding: "5px 12px" }}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/pages/SavedPage.tsx
git commit -m "feat: add Saved Collection page with filters and build CTAs"
```

---

## Task 29: App routing and settings page

**Files:** `src/App.tsx`, `src/pages/SettingsPage.tsx`

- [ ] **Create `src/pages/SettingsPage.tsx`**

```typescript
export function SettingsPage() {
  return (
    <div style={{ padding: 20, maxWidth: 480 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Settings</h2>
      <p style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.7 }}>
        Configure the LLM runner and pipeline schedule in <code>.env</code>. Restart the worker after changes.
      </p>
      <pre style={{ marginTop: 16, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: 14, fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.8 }}>
{`WORKER_SCHEDULE_HOUR=2
WORKER_SCHEDULE_MINUTE=0
ARXIV_CATEGORIES=cs.LG,cs.AI,cs.SE
IDEAS_PER_RUN=8`}
      </pre>
    </div>
  );
}
```

- [ ] **Create `src/App.tsx`**

```typescript
import { Routes, Route, Navigate } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { FeedPage } from "./pages/FeedPage";
import { IdeaDetailPage } from "./pages/IdeaDetailPage";
import { BuildOutputPage } from "./pages/BuildOutputPage";
import { SavedPage } from "./pages/SavedPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/ideas/:id" element={<IdeaDetailPage />} />
        <Route path="/ideas/:id/build" element={<BuildOutputPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
```

- [ ] **Run full test suite**

```bash
npm test -- --run
```

Expected: all PASS.

- [ ] **Commit**

```bash
git add src/
git commit -m "feat: wire all routes in App.tsx and add Settings page"
```

---

## Task 30: Full UI smoke test

- [ ] **Start backend and worker**

```bash
# Terminal 1 — backend
cd whitespace/backend && source .venv/bin/activate && uvicorn app.main:app --port 18730 --reload

# Terminal 2 — worker (if not already run)
cd whitespace/backend && source .venv/bin/activate && python -m worker.main
```

- [ ] **Start frontend**

```bash
# Terminal 3
cd whitespace/frontend && npm run dev
```

- [ ] **Open `http://localhost:18731` and verify**

| Check | Expected |
|---|---|
| Feed loads | Hero card + grid of idea cards |
| Dark mode toggle | Page switches to dark palette |
| Click "Explore →" on any card | Navigates to idea detail |
| Right rail shows connections | Connected idea cards visible |
| "Save" button on detail | Idea appears on `/saved` |
| "Build Plan →" on detail | Navigates to `/ideas/:id/build` |
| "Generate Build Plan" | Status shows "generating" then "ready" |
| Product Sketch tab | Value prop, risks, monetisation rendered |
| Technical Plan tab | Markdown plan text rendered |
| Export MD link | `.md` file downloads |
| "Surprise me" in nav | Navigates to random idea |

- [ ] **Final commit**

```bash
git add .
git commit -m "feat: complete Whitespace v2 frontend — all screens connected to live API"
```

---

**Plan 4 complete.** All four screens built and connected. Whitespace v2 is fully functional end-to-end.

**Docker Compose:** Copy and adapt `whitespace.old/docker/docker-compose.yml` to add the worker as a fifth service, then update `start.sh` to manage all five.
