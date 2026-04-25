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
        <button onClick={() => navigate(`/ideas/${idea.id}`)} style={{
          background: "var(--text-primary)", border: "none", color: "var(--bg)",
          fontSize: 9, padding: "5px 14px", borderRadius: 4, fontWeight: 500,
        }}>
          Explore →
        </button>
      </div>
    </div>
  );
}
