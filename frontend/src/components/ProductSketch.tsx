import type { ReactNode } from "react";
import type { ProductSketch as PS } from "../api/types";

export function ProductSketch({ sketch }: { sketch: PS }) {
  return (
    <div style={{ padding: "40px 24px 80px", maxWidth: 780, margin: "0 auto" }}>
      {/* Value Proposition */}
      <section style={{ marginBottom: 40 }}>
        <SectionTitle>Value Proposition</SectionTitle>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, lineHeight: 1.3 }}>
          {sketch.value_prop_headline}
        </h2>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.75 }}>{sketch.value_prop_body}</p>
      </section>

      {/* Buyer */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <SketchCard title="Buyer Profile">
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>{sketch.buyer_profile}</p>
          </SketchCard>
          <SketchCard title="Buyer Signals">
            <ul style={{ listStyle: "none", padding: 0 }}>
              {sketch.buyer_signals.map((s, i) => (
                <li key={i} style={{ position: "relative", paddingLeft: 18, marginBottom: 8, fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                  <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>→</span>
                  {s}
                </li>
              ))}
            </ul>
          </SketchCard>
        </div>
      </section>

      {/* Risks */}
      <section style={{ marginBottom: 40 }}>
        <SectionTitle>Risks</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {sketch.risks.map((r, i) => (
            <div key={i} style={{
              borderLeft: "3px solid var(--badge-emerging-text)",
              background: "var(--risk-bg)",
              padding: 20,
              borderRadius: "0 12px 12px 0",
            }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>{r.title}</h4>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{r.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Monetisation */}
      <section style={{ marginBottom: 40 }}>
        <SectionTitle>Monetisation</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {sketch.monetisation.map((m, i) => (
            <div key={i} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{m.name}</h4>
              {m.fit === "Strongest fit" && (
                <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--badge-novel-bg)", color: "var(--badge-novel-text)", marginBottom: 10 }}>
                  Strongest fit
                </span>
              )}
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{m.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Caveat */}
      {sketch.caveat && (
        <div style={{ background: "var(--bg)", border: "1px dashed var(--border)", borderRadius: 8, padding: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>⚠ {sketch.caveat}</p>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
      {children}
    </p>
  );
}

function SketchCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  );
}
