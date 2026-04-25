import { useNavigate } from "react-router-dom";
import type { IdeaSummary } from "../api/types";
import { BadgeRow } from "./BadgeRow";
import { ScoreBar } from "./ScoreBar";

export function IdeaCard({ idea }: { idea: IdeaSummary }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/ideas/${idea.id}`)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      <div style={{ marginBottom: 12 }}><BadgeRow badges={[idea.badge]} /></div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 16, flexGrow: 1 }}>
        {idea.title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <ScoreBar label="Novelty" value={idea.novelty_score} type="novelty" />
        <ScoreBar label="Feasibility" value={idea.feasibility_score} type="feasibility" />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {idea.paper_ids.length} paper{idea.paper_ids.length !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>Explore →</span>
      </div>
    </div>
  );
}
