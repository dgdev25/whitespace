import type { Badge } from "../api/types";

const BADGE_LABELS: Record<Badge, string> = {
  novel: "NOVEL",
  feasible: "FEASIBLE",
  speculative: "SPECULATIVE",
  emerging: "EMERGING",
};

export function BadgeRow({ badges }: { badges: Badge[] }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {badges.map(b => (
        <span key={b} style={{
          background: `var(--badge-${b}-bg)`,
          color: `var(--badge-${b}-text)`,
          fontSize: 8,
          fontWeight: 700,
          padding: "2px 7px",
          borderRadius: 3,
          letterSpacing: ".5px",
        }}>
          {BADGE_LABELS[b]}
        </span>
      ))}
    </div>
  );
}
