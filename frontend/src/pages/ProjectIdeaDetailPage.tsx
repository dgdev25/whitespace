import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectIdea, useGenerateProjectIdeaPrd } from "../hooks/useProjects";

function ScoreRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", width: 80, flexShrink: 0 }}>{label}</span>
      <div style={{ flexGrow: 1, height: 6, background: "var(--surface2)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", width: 28, flexShrink: 0, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>{label}</p>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{value}</p>
    </div>
  );
}

export function ProjectIdeaDetailPage() {
  const { projectId, ideaId } = useParams<{ projectId: string; ideaId: string }>();
  const navigate = useNavigate();
  const { data: idea, isLoading, isError } = useProjectIdea(Number(projectId), ideaId!);
  const generatePrd = useGenerateProjectIdeaPrd(Number(projectId), ideaId!);

  if (isLoading) {
    return <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px", color: "var(--text-muted)" }}>Loading…</div>;
  }
  if (isError || !idea) {
    return <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px", color: "#f87171" }}>Idea not found.</div>;
  }

  const allTags = idea.tags ?? [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 100px" }}>
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        style={{ background: "none", border: "none", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", padding: 0, marginBottom: 28, cursor: "pointer" }}
      >
        ← Back to Project
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 48, alignItems: "start" }}>
        {/* Main */}
        <div>
          {allTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {allTags.map(t => (
                <span key={t} style={{ background: "var(--domain-ai-dim)", color: "var(--domain-ai-text)", border: "1px solid var(--domain-ai-border)", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          )}

          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 16 }}>
            {idea.title}
          </h1>

          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 36 }}>
            {idea.description}
          </p>

          {idea.why_novel && (
            <Section label="Why It's Novel">
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.75 }}>{idea.why_novel}</p>
            </Section>
          )}

          {(idea.who_builds || idea.who_buys) && (
            <Section label="Market">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {idea.who_builds && <InfoBox label="Who Builds This" value={idea.who_builds} />}
                {idea.who_buys && <InfoBox label="Who Buys This" value={idea.who_buys} />}
              </div>
            </Section>
          )}

          {idea.paper_refs.length > 0 && (
            <Section label={`Research Basis — ${idea.paper_refs.length} source${idea.paper_refs.length !== 1 ? "s" : ""}`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {idea.paper_refs.map(ref => (
                  <a
                    key={ref}
                    href={`https://arxiv.org/abs/${ref}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "var(--surface)", border: "1px solid var(--border)",
                      padding: "8px 14px", borderRadius: 8, textDecoration: "none",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <span style={{ color: "var(--accent)", fontSize: 12 }}>↗</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "IBM Plex Mono, monospace" }}>{ref}</span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* PRD section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
                Product Requirements Document
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {idea.prd && (
                  <button
                    onClick={() => {
                      const blob = new Blob([idea.prd!], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${idea.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-prd.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{
                      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
                      padding: "6px 14px", fontSize: 12, fontWeight: 600,
                      color: "var(--text-secondary)", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    ↓ Download
                  </button>
                )}
                <button
                  onClick={() => generatePrd.mutate()}
                  disabled={generatePrd.isPending}
                  style={{
                    background: generatePrd.isPending ? "var(--surface2)" : "var(--accent)",
                    color: generatePrd.isPending ? "var(--text-muted)" : "white",
                    border: "none", borderRadius: 8, padding: "6px 14px",
                    fontSize: 12, fontWeight: 600, cursor: generatePrd.isPending ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {generatePrd.isPending ? (
                    <>
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--text-muted)", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                      Generating…
                    </>
                  ) : idea.prd ? "Regenerate PRD" : "Generate PRD"}
                </button>
              </div>
            </div>

            {generatePrd.isError && (
              <p style={{ fontSize: 13, color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px" }}>
                Failed to generate PRD — check that the backend runner is configured.
              </p>
            )}

            {idea.prd ? (
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
                padding: "24px 28px", fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)",
              }}>
                <style>{`
                  .prd-body h1 { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0 0 16px; line-height: 1.3; }
                  .prd-body h2 { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 28px 0 10px; }
                  .prd-body h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 20px 0 8px; }
                  .prd-body p { margin: 0 0 12px; }
                  .prd-body ul, .prd-body ol { margin: 0 0 12px; padding-left: 20px; }
                  .prd-body li { margin-bottom: 4px; }
                  .prd-body table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
                  .prd-body th { background: var(--surface2); padding: 8px 12px; text-align: left; font-weight: 600; color: var(--text-primary); border: 1px solid var(--border); }
                  .prd-body td { padding: 8px 12px; border: 1px solid var(--border); }
                  .prd-body hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
                  .prd-body strong { font-weight: 600; color: var(--text-primary); }
                  .prd-body em { color: var(--text-muted); }
                  .prd-body code { font-family: IBM Plex Mono, monospace; font-size: 12px; background: var(--surface2); padding: 1px 5px; border-radius: 4px; }
                  .prd-body blockquote { border-left: 3px solid var(--border); margin: 0 0 12px; padding-left: 14px; color: var(--text-muted); }
                `}</style>
                <div className="prd-body">
                  <ReactMarkdown>{idea.prd}</ReactMarkdown>
                </div>
              </div>
            ) : !generatePrd.isPending && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>
                No PRD yet — click "Generate PRD" to create one.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside style={{ position: "sticky", top: 80 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>Scores</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ScoreRow label="Overall" value={idea.score} color="var(--accent)" />
              <ScoreRow label="Novelty" value={idea.novelty_score} color="var(--badge-novel-text)" />
              <ScoreRow label="Feasibility" value={idea.feasibility_score} color="var(--badge-feasible-text)" />
              <ScoreRow label="Impact" value={idea.impact_score} color="var(--domain-ai-text)" />
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>Details</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              Added {new Date(idea.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {idea.is_featured && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--domain-ai-text)", background: "var(--domain-ai-dim)", border: "1px solid var(--domain-ai-border)", padding: "3px 10px", borderRadius: 999, marginTop: 8 }}>
                ★ Top idea
              </span>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
