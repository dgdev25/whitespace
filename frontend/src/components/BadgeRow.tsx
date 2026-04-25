import type { Badge } from "../api/types";

export function BadgeRow({ badges }: { badges: Badge[] }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {badges.map(b => (
        <span key={b} style={{
          background: `var(--badge-${b}-bg)`,
          color: `var(--badge-${b}-text)`,
          fontSize: 12,
          fontWeight: 500,
          padding: "3px 10px",
          borderRadius: 999,
          textTransform: "capitalize" as const,
        }}>
          {b}
        </span>
      ))}
    </div>
  );
}
