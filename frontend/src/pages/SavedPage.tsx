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
    <button key={f} onClick={() => setFilter(f)} style={{
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
              <button onClick={() => navigate(`/ideas/${s.idea.id}/build`)} style={{ background: "var(--text-primary)", border: "none", color: "var(--bg)", fontSize: 8, padding: "5px 12px", borderRadius: 4, fontWeight: 600 }}>
                {s.has_build_output ? "View Plan →" : "Build Plan →"}
              </button>
              <button onClick={() => navigate(`/ideas/${s.idea.id}`)} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 8, padding: "5px 12px", borderRadius: 4 }}>Explore</button>
              <button onClick={() => unsave.mutate(s.idea.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 8, padding: "5px 12px" }}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
