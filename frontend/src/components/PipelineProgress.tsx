import type { PipelineStep } from "../hooks/usePipelineStream";

const STEP_LABELS: Record<string, string> = {
  start: "Starting",
  fetch_arxiv: "arXiv papers",
  fetch_blogs: "Blog posts",
  fetch_s2: "Semantic Scholar",
  fetch_github: "GitHub repos",
  analyse: "Analysing sources",
  critique: "Critical review",
  gap_map: "Mapping gaps",
  synthesise: "Synthesising ideas",
  score: "Scoring",
  select: "Selecting top ideas",
  connect: "Computing connections",
  complete: "Complete",
  error: "Error",
};

const STEP_ORDER = [
  "start", "fetch_arxiv", "fetch_blogs", "fetch_s2", "fetch_github",
  "analyse", "critique", "gap_map", "synthesise",
  "score", "select", "connect", "complete",
];

function StatusIcon({ status }: { status: PipelineStep["status"] }) {
  if (status === "done") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: "var(--accent)" }}>
        <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeOpacity="0.3" />
        <path d="M4 7l2.5 2.5L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "error") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: "#ef4444" }}>
        <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeOpacity="0.3" />
        <path d="M5 5l4 4M9 5l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <span style={{
      width: 14, height: 14, flexShrink: 0,
      border: "2px solid var(--accent)",
      borderRightColor: "transparent",
      borderRadius: "50%",
      display: "inline-block",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

interface Props {
  steps: PipelineStep[];
}

export function PipelineProgress({ steps }: Props) {
  if (steps.length === 0) return null;

  const stepMap = new Map(steps.map(s => [s.step, s]));

  // Build display list: show steps that have arrived, in order
  const displayed = STEP_ORDER
    .map(key => ({ key, step: stepMap.get(key) }))
    .filter(({ step }) => step !== undefined) as { key: string; step: PipelineStep }[];

  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 8px)",
      right: 0,
      width: 320,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      padding: "12px 0",
      zIndex: 100,
    }}>
      <div style={{ padding: "0 14px 8px", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase" }}>
        Pipeline Progress
      </div>
      {displayed.map(({ key, step }) => (
        <div key={key} style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "5px 14px",
          opacity: step.status === "done" ? 0.7 : 1,
        }}>
          <StatusIcon status={step.status} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {STEP_LABELS[key] ?? key}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {step.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
