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
