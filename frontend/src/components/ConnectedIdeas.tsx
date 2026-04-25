import { useNavigate } from "react-router-dom";
import type { ConnectedIdea } from "../api/types";
import { BadgeRow } from "./BadgeRow";

export function ConnectedIdeas({ ideas }: { ideas: ConnectedIdea[] }) {
  const navigate = useNavigate();
  if (ideas.length === 0) return null;
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
        Connected Ideas
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {ideas.map((c, i) => (
          <div
            key={c.id}
            onClick={() => navigate(`/ideas/${c.id}`)}
            style={{
              paddingBottom: 14,
              marginBottom: 14,
              borderBottom: i < ideas.length - 1 ? "1px solid var(--border)" : "none",
              cursor: "pointer",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 6 }}>
              {c.title}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BadgeRow badges={[c.badge]} />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {c.shared_paper_count} shared paper{c.shared_paper_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
