import { useNavigate } from "react-router-dom";
import type { IdeaSummary } from "../api/types";
import { BadgeRow } from "./BadgeRow";
import { ScoreBar } from "./ScoreBar";

export function HeroCard({ idea }: { idea: IdeaSummary }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/ideas/${idea.id}`)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 32,
        marginBottom: 32,
        boxShadow: "var(--shadow-sm)",
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        position: "relative",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)"; }}
    >
      <span style={{
        position: "absolute", top: 0, right: 0,
        background: "var(--badge-feasible-bg)", color: "var(--badge-feasible-text)",
        fontSize: 11, fontWeight: 700, padding: "5px 14px",
        borderRadius: "0 12px 0 8px", letterSpacing: 0.5,
      }}>
        FEATURED TODAY
      </span>
      <div style={{ marginBottom: 12, paddingRight: 120 }}>
        <BadgeRow badges={[idea.badge]} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10, lineHeight: 1.3 }}>
        {idea.title}
      </h2>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 20 }}>
        {idea.description}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        <ScoreBar label="Novelty" value={idea.novelty_score} type="novelty" />
        <ScoreBar label="Feasibility" value={idea.feasibility_score} type="feasibility" />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {idea.paper_ids.length} paper{idea.paper_ids.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/ideas/${idea.id}/build`); }}
          style={{
            background: "var(--accent)", border: "none", color: "white",
            fontSize: 14, fontWeight: 600, padding: "8px 20px", borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Build Plan →
        </button>
      </div>
    </div>
  );
}
