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
