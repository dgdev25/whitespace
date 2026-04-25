import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSaved, useUnsaveIdea } from "../hooks/useSaved";
import { BadgeRow } from "../components/BadgeRow";
import { ScoreBar } from "../components/ScoreBar";

type Filter = "all" | "built" | "unexplored";

export function SavedPage() {
  const { data: saved, isLoading } = useSaved();
  const unsave = useUnsaveIdea();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");

  if (isLoading) return <p style={{ padding: "40px 24px", color: "var(--text-muted)" }}>Loading...</p>;

  const filtered = (saved ?? []).filter(s => {
    if (filter === "built") return s.has_build_output;
    if (filter === "unexplored") return !s.has_build_output;
    return true;
  });

  const filterBtnStyle = (f: Filter) => ({
    background: filter === f ? "var(--surface)" : "transparent",
    border: "1px solid var(--border)",
    color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
    fontSize: 14, fontWeight: filter === f ? 600 : 400,
    padding: "6px 14px", borderRadius: 8,
    cursor: "pointer" as const,
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 60px" }}>
      <header style={{ padding: "48px 0 32px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>Saved Ideas</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            {filtered.length} idea{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "built", "unexplored"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={filterBtnStyle(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {filtered.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
          {filter === "all" ? "No saved ideas yet — explore the feed and save what interests you." : "No ideas match this filter."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map(s => (
          <div key={s.id} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 24,
            display: "flex", alignItems: "flex-start", gap: 24,
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
                <BadgeRow badges={[s.idea.badge]} />
                {s.has_build_output && (
                  <span style={{ background: "var(--badge-novel-bg)", color: "var(--badge-novel-text)", fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 999 }}>
                    ✓ Build Plan Ready
                  </span>
                )}
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.3 }}>{s.idea.title}</p>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>{s.idea.description}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
                <ScoreBar label="Novelty" value={s.idea.novelty_score} type="novelty" />
                <ScoreBar label="Feasibility" value={s.idea.feasibility_score} type="feasibility" />
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
                Saved {new Date(s.saved_at).toLocaleDateString()} · {s.idea.paper_ids.length} paper{s.idea.paper_ids.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              <button onClick={() => navigate(`/ideas/${s.idea.id}/build`)} style={{ background: "var(--accent)", border: "none", color: "white", fontSize: 14, fontWeight: 600, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
                {s.has_build_output ? "View Plan →" : "Build Plan →"}
              </button>
              <button onClick={() => navigate(`/ideas/${s.idea.id}`)} style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 14, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
                Explore
              </button>
              <button onClick={() => unsave.mutate(s.idea.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, padding: "8px 0", cursor: "pointer" }}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
