import type { ReactNode } from "react";
import type { ProductSketch as PS } from "../api/types";

export function ProductSketch({ sketch }: { sketch: PS }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, minHeight: 340 }}>
      <div style={{ padding: 18, borderRight: "1px solid var(--border)" }}>
        <SketchSection label="VALUE PROPOSITION" color="var(--accent)">
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{sketch.value_prop_headline}</p>
          <p style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.7 }}>{sketch.value_prop_body}</p>
        </SketchSection>
        <SketchSection label="LIKELY BUYER" color="var(--badge-novel-text)">
          <div style={{ background: "var(--badge-novel-bg)", border: "1px solid var(--badge-novel-text)33", borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--badge-novel-text)", marginBottom: 6 }}>{sketch.buyer_profile}</p>
            <ul style={{ fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: 14 }}>
              {sketch.buyer_signals.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </SketchSection>
        <SketchSection label="KEY RISKS" color="var(--badge-emerging-text)">
          {sketch.risks.map((r, i) => (
            <div key={i} style={{ background: "var(--risk-bg)", borderLeft: "3px solid var(--risk-border)", padding: "7px 10px", borderRadius: "0 4px 4px 0", marginBottom: 6 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{r.title}</p>
              <p style={{ fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.5 }}>{r.description}</p>
            </div>
          ))}
        </SketchSection>
      </div>
      <div style={{ padding: 18 }}>
        <SketchSection label="MONETISATION PATTERNS" color="#7c3aed">
          <p style={{ fontSize: 8, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>Three plausible models — hypotheses to validate, not conclusions</p>
          {sketch.monetisation.map((m, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: 12, marginBottom: 8, boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>{m.name}</p>
                {m.fit === "Strongest fit" && (
                  <span style={{ background: "var(--badge-feasible-bg)", color: "var(--badge-feasible-text)", fontSize: 8, padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>
                    {m.fit}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.6 }}>{m.description}</p>
            </div>
          ))}
          <div style={{ background: "var(--bg)", border: "1px dashed var(--border)", borderRadius: 5, padding: 10, marginTop: 8 }}>
            <p style={{ fontSize: 8, color: "var(--text-muted)", lineHeight: 1.7 }}>&#9888; {sketch.caveat}</p>
          </div>
        </SketchSection>
      </div>
    </div>
  );
}

function SketchSection({ label, color, children }: { label: string; color: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 9, color, letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {children}
    </div>
  );
}
