import { useState } from "react";
import { useHistory } from "../hooks/useIdeas";
import { IdeaCard } from "../components/IdeaCard";
import type { Badge } from "../api/types";

const BADGES: Badge[] = ["novel", "feasible", "speculative", "emerging"];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export function HistoryPage() {
  const { data: groups, isLoading, isError } = useHistory();
  const [badge, setBadge] = useState<Badge | null>(null);

  if (isLoading) return <p style={{ padding: "40px 24px", color: "var(--text-muted)" }}>Loading history…</p>;
  if (isError || !groups) return <p style={{ padding: "40px 24px", color: "var(--badge-emerging-text)" }}>Failed to load history.</p>;

  const filtered = groups.map(g => ({
    ...g,
    ideas: badge ? g.ideas.filter(i => i.badge === badge) : g.ideas,
  })).filter(g => g.ideas.length > 0);

  const totalIdeas = groups.reduce((sum, g) => sum + g.ideas.length, 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>History</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            {groups.length} run{groups.length !== 1 ? "s" : ""} · {totalIdeas} idea{totalIdeas !== 1 ? "s" : ""} total
          </p>
        </div>

        {/* Badge filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setBadge(null)}
            style={{
              padding: "5px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
              background: badge === null ? "var(--accent)" : "var(--bg)",
              border: badge === null ? "1px solid var(--accent)" : "1px solid var(--border)",
              color: badge === null ? "white" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            All
          </button>
          {BADGES.map(b => (
            <button
              key={b}
              onClick={() => setBadge(b === badge ? null : b)}
              style={{
                padding: "5px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
                background: badge === b ? "var(--accent)" : "var(--bg)",
                border: badge === b ? "1px solid var(--accent)" : "1px solid var(--border)",
                color: badge === b ? "white" : "var(--text-muted)",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No ideas match the selected filter.</p>
      ) : (
        filtered.map(group => (
          <div key={group.date} style={{ marginBottom: 48 }}>
            {/* Date header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase",
                color: "var(--text-muted)", whiteSpace: "nowrap",
              }}>
                {formatDate(group.date)}
                {group.run_label && <span style={{ marginLeft: 6, fontWeight: 400 }}>· {group.run_label}</span>}
              </p>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                · {group.ideas.length} idea{group.ideas.length !== 1 ? "s" : ""}
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}>
              {group.ideas.map(idea => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
