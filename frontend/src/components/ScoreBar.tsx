interface ScoreBarProps {
  label: string;
  value: number;  // 0–1
  type: "novelty" | "feasibility";
}

const BAR_COLOR: Record<ScoreBarProps["type"], string> = {
  novelty: "var(--badge-novel-text)",
  feasibility: "var(--badge-feasible-text)",
};

export function ScoreBar({ label, value, type }: ScoreBarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", width: 72, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flexGrow: 1, height: 5, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.round(value * 100)}%`, background: BAR_COLOR[type], borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", width: 30, flexShrink: 0, textAlign: "right" }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}
