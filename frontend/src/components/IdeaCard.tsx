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
