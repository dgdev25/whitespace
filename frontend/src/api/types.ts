export interface ScheduleStatus {
  enabled: boolean;
  interval_minutes: number;
  next_run_at: string | null;
}

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
  created_at: string;
}

export interface PaperRef {
  arxiv_id: string;
  title: string;
  url: string;
  source: "arxiv" | "github" | "blog" | "semantic_scholar" | string;
}

export interface IdeaDetail extends IdeaSummary {
  why_novel: string;
  who_builds: string;
  who_buys: string;
  paper_refs: PaperRef[];
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
  prd: string | null;
  status: "pending" | "generating" | "ready" | "failed";
  created_at: string;
}

export interface RunnerStatus {
  name: string;
  label: string;
  available: boolean;
  method: "cli" | "api";
}

export interface RunnersResponse {
  runners: RunnerStatus[];
  active: string | null;
}

export interface SystemConfig {
  schedule_hour: number;
  schedule_minute: number;
  ideas_per_run: number;
  max_sources_per_run: number;
  cached_analyses_count: number;
  runner_model_prefs: Record<string, string>;
  arxiv_orgs: string[];
  arxiv_categories: string[];
  active_orgs: string[];
  active_categories: string[];
  github_repos: string[];
}

export interface PipelineRunResponse {
  status: "started" | "already_running";
  message: string;
}

export interface HistoryGroup {
  date: string;
  run_id: string | null;
  run_label: string;
  ideas: IdeaSummary[];
}

export interface OrgImportStatus {
  running: boolean;
  handle: string | null;
  scanned: number;
  total: number | null;
  imported: number;
  message: string;
}
