import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProject, useProjectIdeas, useProjectRuns, useProjectRunStatus, useTriggerProjectRun, useUpdateProject, useDeleteProject } from "../hooks/useProjects";
import { IconCheck, IconRefresh, IconX, IconHeart, IconSparkle, IconStar } from "../components/Icons";
import type { ProjectIdea, ProjectRun } from "../api/types";

type DetailTab = "ideas" | "pipeline" | "sources" | "settings";

const DOMAIN_META: Record<string, { label: string; color: string; dimColor: string; borderColor: string }> = {
  ai:         { label: "AI / ML",    color: "var(--domain-ai-text)",        dimColor: "var(--domain-ai-dim)",        borderColor: "var(--domain-ai-border)" },
  biomedical: { label: "Biomedical", color: "var(--domain-bio-text)",       dimColor: "var(--domain-bio-dim)",       borderColor: "var(--domain-bio-border)" },
  climate:    { label: "Climate",    color: "var(--domain-climate-text)",   dimColor: "var(--domain-climate-dim)",   borderColor: "var(--domain-climate-border)" },
  finance:    { label: "Finance",    color: "var(--domain-finance-text)",   dimColor: "var(--domain-finance-dim)",   borderColor: "var(--domain-finance-border)" },
  materials:  { label: "Materials",  color: "var(--domain-materials-text)", dimColor: "var(--domain-materials-dim)", borderColor: "var(--domain-materials-border)" },
  custom:     { label: "Custom",     color: "var(--domain-ai-text)",        dimColor: "var(--domain-ai-dim)",        borderColor: "var(--domain-ai-border)" },
};

function dm(domain: string) { return DOMAIN_META[domain] ?? DOMAIN_META.custom; }

function ScoreRing({ score }: { score: number }) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: "50%", flexShrink: 0, position: "relative",
      background: `conic-gradient(var(--accent) ${score}%, var(--surface2) 0%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ position: "absolute", width: 32, height: 32, borderRadius: "50%", background: "var(--surface)" }} />
      <span style={{ position: "relative", zIndex: 1, fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>{score}</span>
    </div>
  );
}

function PaperRef({ id }: { id: string }) {
  const short = id.length > 20 ? id.slice(0, 20) + "…" : id;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "var(--surface2)", border: "1px solid var(--border)",
      padding: "2px 8px", borderRadius: 4, fontSize: 11, color: "var(--text-secondary)",
      fontFamily: "IBM Plex Mono, monospace",
    }}>
      {short}
    </span>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border)", padding: "3px 10px", borderRadius: 999, fontSize: 12, color: "var(--text-secondary)" }}>
      {label}
    </span>
  );
}

function IdeaCard({ idea, projectId }: { idea: ProjectIdea; projectId: number }) {
  const navigate = useNavigate();
  const isTop = idea.is_featured;
  return (
    <div
      onClick={() => navigate(`/projects/${projectId}/ideas/${idea.id}`)}
      style={{
        background: isTop ? "linear-gradient(135deg, var(--surface) 0%, var(--domain-ai-dim) 100%)" : "var(--surface)",
        border: `1px solid ${isTop ? "var(--domain-ai-border)" : "var(--border)"}`,
        borderRadius: 10, padding: 18, marginBottom: 12, transition: "border-color 0.15s, box-shadow 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.borderColor = isTop ? "var(--domain-ai-border)" : "var(--accent)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ""; (e.currentTarget as HTMLDivElement).style.borderColor = isTop ? "var(--domain-ai-border)" : "var(--border)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <ScoreRing score={idea.score} />
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {idea.tags.slice(0, 2).map(t => (
                <span key={t} style={{ background: "var(--domain-ai-dim)", color: "var(--domain-ai-text)", border: "1px solid var(--domain-ai-border)", padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{t}</span>
              ))}
              {isTop && <span style={{ fontSize: 10, color: "var(--text-muted)", alignSelf: "center", display: "inline-flex", alignItems: "center", gap: 3 }}><IconStar size={10} /> Top idea</span>}
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>{idea.title}</h3>
          </div>
        </div>
        <button onClick={e => e.stopPropagation()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0, display: "flex", alignItems: "center", padding: 0 }}><IconHeart size={18} /></button>
      </div>

      {idea.description && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>{idea.description}</p>
      )}

      {idea.paper_refs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {idea.paper_refs.slice(0, 4).map(ref => <PaperRef key={ref} id={ref} />)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {idea.tags.slice(2).map(t => <Tag key={t} label={t} />)}
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          Novelty {idea.novelty_score} · Feasibility {idea.feasibility_score} · Impact {idea.impact_score}
        </span>
      </div>
    </div>
  );
}

function StageIcon({ status }: { status: string }) {
  const base: React.CSSProperties = { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  if (status === "done") return (
    <div style={{ ...base, background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}><IconCheck size={12} /></div>
  );
  if (status === "running") return (
    <div style={{ ...base, background: "var(--domain-ai-dim)", color: "var(--domain-ai-text)", border: "1px solid var(--domain-ai-border)", animation: "spin 1s linear infinite" }}><IconRefresh size={12} /></div>
  );
  if (status === "error") return (
    <div style={{ ...base, background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}><IconX size={12} /></div>
  );
  return (
    <div style={{ ...base, background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)", fontSize: 11 }}>—</div>
  );
}

function formatRunTime(run: ProjectRun): string {
  if (!run.started_at) return "";
  const d = new Date(run.started_at);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const id = Number(projectId);
  const [tab, setTab] = useState<DetailTab>("ideas");
  const [editingFocus, setEditingFocus] = useState(false);
  const [focusDraft, setFocusDraft] = useState("");

  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: ideas, isLoading: ideasLoading } = useProjectIdeas(id);
  const { data: runs } = useProjectRuns(id);
  const { data: runStatus } = useProjectRunStatus(id, tab === "pipeline");
  const triggerRun = useTriggerProjectRun(id);
  const updateProject = useUpdateProject(id);
  const deleteProject = useDeleteProject();

  const isRunning = runStatus?.running ?? false;
  const meta = project ? dm(project.domain) : dm("ai");

  const tabStyle = (t: DetailTab): React.CSSProperties => ({
    background: "none", border: "none", padding: "10px 20px", fontFamily: "inherit",
    fontSize: 13, fontWeight: tab === t ? 600 : 400,
    color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
    borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
    cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.15s", marginBottom: -1,
  });

  if (projectLoading || !project) {
    return <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 100px" }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes spin { to { transform:rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/projects")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0 }}>
            ← Projects
          </button>
          <span style={{ color: "var(--border)" }}>/</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>{project.name}</h1>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: meta.dimColor, color: meta.color, border: `1px solid ${meta.borderColor}` }}>
            {meta.label}
          </span>
          {isRunning ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--domain-ai-dim)", color: "var(--domain-ai-text)", border: "1px solid var(--domain-ai-border)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", animation: "pulse 1.5s ease-in-out infinite" }} />
              Running
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
              Up to date
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isRunning ? (
            <span style={{ padding: "7px 14px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>Running…</span>
          ) : (
            <button
              onClick={() => { triggerRun.mutate(); setTab("pipeline"); }}
              disabled={triggerRun.isPending}
              style={{ padding: "7px 14px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <IconRefresh size={12} /> Run Pipeline
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Delete "${project.name}"? This will permanently remove all its ideas and pipeline history.`)) {
                deleteProject.mutate(id, { onSuccess: () => navigate("/projects") });
              }
            }}
            disabled={deleteProject.isPending}
            style={{ padding: "7px 14px", borderRadius: 8, background: "none", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", fontSize: 12, cursor: "pointer" }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Subtitle bar */}
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
        {project.ideas_count} ideas · {project.papers_count > 0 ? `${project.papers_count} papers indexed · ` : ""}
        {project.last_run ? `Last run ${new Date(project.last_run.started_at).toLocaleString()}` : "Never run"}
      </p>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 28 }}>
        {(["ideas", "pipeline", "sources", "settings"] as DetailTab[]).map(t => (
          <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* IDEAS TAB */}
      {tab === "ideas" && (
        <>
          {ideasLoading ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading ideas…</div>
          ) : ideas && ideas.length > 0 ? (
            <>
              {ideas.map(idea => <IdeaCard key={idea.id} idea={idea} projectId={id} />)}
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {ideas.length} idea{ideas.length !== 1 ? "s" : ""} generated
                </p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ marginBottom: 12, color: "var(--text-muted)" }}><IconSparkle size={32} /></div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>No ideas yet</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>Run the pipeline to generate domain-specific ideas.</p>
              <button
                onClick={() => { triggerRun.mutate(); setTab("pipeline"); }}
                style={{ padding: "10px 24px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              >
                Run Pipeline
              </button>
            </div>
          )}
        </>
      )}

      {/* PIPELINE TAB */}
      {tab === "pipeline" && (
        <>
          {/* Overall progress */}
          {runStatus?.current_run && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>Current Run</h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                    {isRunning ? "Pipeline in progress…" : `Completed · ${runStatus.current_run.ideas_generated} ideas generated`}
                  </p>
                </div>
                <span style={{ display: "flex", alignItems: "center", color: runStatus.current_run.status === "error" ? "#f87171" : runStatus.current_run.status === "done" ? "#4ade80" : "var(--accent)" }}>
                  {runStatus.current_run.status === "running"
                    ? <span style={{ fontSize: 22, fontWeight: 700 }}>…</span>
                    : runStatus.current_run.status === "done"
                    ? <IconCheck size={22} />
                    : <IconX size={22} />}
                </span>
              </div>
              {isRunning && (
                <div style={{ height: 8, borderRadius: 4, background: "var(--surface2)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, var(--accent), #818cf8)", width: "50%", animation: "shimmer-pipeline 2s ease-in-out infinite" }} />
                </div>
              )}
              {runStatus.current_run.error && (
                <p style={{ fontSize: 13, color: "#f87171", marginTop: 10, background: "rgba(239,68,68,0.08)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
                  Error: {runStatus.current_run.error}
                </p>
              )}
            </div>
          )}

          {/* Stage list — show from current run stages or default stages */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Pipeline Stages</h3>
            </div>
            {(runStatus?.current_run?.stages?.length
              ? runStatus.current_run.stages
              : DEFAULT_STAGES
            ).map((stage: { name: string; label: string; message?: string; status: string }, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 0", borderBottom: i < 7 ? "1px solid var(--border)" : "none" }}>
                <StageIcon status={stage.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: stage.status === "pending" ? "var(--text-muted)" : "var(--text-primary)" }}>
                      {stage.label}
                    </p>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {stage.status === "done" ? "done" : stage.status === "running" ? "running" : ""}
                    </span>
                  </div>
                  {stage.message && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{stage.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Run history */}
          {runs && runs.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
              <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>Run History</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: "10px 20px", alignItems: "center" }}>
                {runs.map(run => (
                  <>
                    <RunStatusPill key={`s-${run.id}`} status={run.status} />
                    <span key={`t-${run.id}`} style={{ fontSize: 13 }}>{formatRunTime(run)}</span>
                    <span key={`p-${run.id}`} style={{ fontSize: 12, color: "var(--text-muted)" }}>{run.papers_fetched} sources</span>
                    <span key={`i-${run.id}`} style={{ fontSize: 12, color: "var(--text-muted)" }}>{run.ideas_generated} ideas</span>
                    <span key={`e-${run.id}`} style={{ fontSize: 12, color: run.error ? "#f87171" : "var(--text-muted)" }}>
                      {run.error ? "Error" : "—"}
                    </span>
                  </>
                ))}
              </div>
            </div>
          )}

          {(!runs || runs.length === 0) && !runStatus?.current_run && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No runs yet.</p>
              <button
                onClick={() => triggerRun.mutate()}
                style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              >
                Run Pipeline
              </button>
            </div>
          )}
        </>
      )}

      {/* SOURCES TAB (stub) */}
      {tab === "sources" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Configured Sources</h3>
            {Object.entries(project.source_config?.enabled_sources ?? {}).map(([key, enabled]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14, fontWeight: 500, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                <span style={{ fontSize: 12, color: enabled ? "#4ade80" : "var(--text-muted)", background: enabled ? "rgba(34,197,94,0.1)" : "var(--surface2)", padding: "2px 10px", borderRadius: 999, border: `1px solid ${enabled ? "rgba(34,197,94,0.25)" : "var(--border)"}` }}>
                  {enabled ? "Active" : "Disabled"}
                </span>
              </div>
            ))}
            {Object.keys(project.source_config?.enabled_sources ?? {}).length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Using default source configuration.</p>
            )}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>arXiv Filter</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Categories and organisations used when fetching arXiv papers for this project.</p>

            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Organisations</p>
            {(project.source_config?.orgs ?? []).length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {(project.source_config!.orgs as string[]).map(o => (
                  <span key={o} style={{ background: "var(--surface2)", border: "1px solid var(--border)", padding: "3px 10px", borderRadius: 999, fontSize: 12, color: "var(--text-secondary)" }}>{o}</span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Using global settings</p>
            )}

            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Categories</p>
            {(project.source_config?.categories ?? []).length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(project.source_config!.categories as string[]).map(c => (
                  <span key={c} style={{ background: "var(--surface2)", border: "1px solid var(--border)", padding: "3px 10px", borderRadius: 999, fontSize: 12, color: "var(--text-secondary)", fontFamily: "ui-monospace, monospace" }}>{c}</span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Using global settings</p>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS TAB (stub) */}
      {tab === "settings" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Pipeline Settings</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              ["Ideas per Run", project.pipeline_config?.ideas_per_run ?? 8],
              ["Max Sources per Run", project.pipeline_config?.max_sources_per_run ?? 40],
              ["Cached Analyses", project.pipeline_config?.cached_analyses_count ?? 30],
            ].map(([label, val]) => (
              <div key={String(label)}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 700 }}>{val}</p>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Research Focus</h3>
            {!editingFocus && (
              <button
                onClick={() => { setFocusDraft(project.focus_statement ?? ""); setEditingFocus(true); }}
                style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
              >
                Edit
              </button>
            )}
          </div>
          {editingFocus ? (
            <>
              <textarea
                value={focusDraft}
                onChange={e => setFocusDraft(e.target.value)}
                maxLength={2000}
                rows={5}
                style={{ width: "100%", fontSize: 14, lineHeight: 1.6, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", resize: "vertical", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setEditingFocus(false)}
                  style={{ fontSize: 13, fontWeight: 500, padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border)", background: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  disabled={updateProject.isPending}
                  onClick={() => updateProject.mutate({ focus_statement: focusDraft }, { onSuccess: () => setEditingFocus(false) })}
                  style={{ fontSize: 13, fontWeight: 600, padding: "6px 14px", borderRadius: 7, border: "none", background: "var(--accent, #6366f1)", color: "#fff", cursor: "pointer", opacity: updateProject.isPending ? 0.6 : 1 }}
                >
                  {updateProject.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 14, color: project.focus_statement ? "var(--text-secondary)" : "var(--text-tertiary, var(--text-secondary))", lineHeight: 1.6, fontStyle: project.focus_statement ? "normal" : "italic" }}>
              {project.focus_statement || "No research focus set."}
            </p>
          )}
        </div>
      )}

      <style>{`@keyframes shimmer-pipeline { 0% { transform:translateX(-100%) } 100% { transform:translateX(250%) } }`}</style>
    </div>
  );
}

function RunStatusPill({ status }: { status: string }) {
  if (status === "running") return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--domain-ai-dim)", color: "var(--domain-ai-text)", border: "1px solid var(--domain-ai-border)", whiteSpace: "nowrap" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />running</span>;
  if (status === "error") return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", whiteSpace: "nowrap" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />error</span>;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)", whiteSpace: "nowrap" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />done</span>;
}

const DEFAULT_STAGES = [
  { name: "fetch_arxiv",  label: "Fetch arXiv",         message: "Papers from configured AI lab orgs",         status: "pending" },
  { name: "fetch_s2",     label: "Fetch Semantic Scholar", message: "Academic papers with citation data",       status: "pending" },
  { name: "fetch_blogs",  label: "Fetch Blogs",          message: "Research blog posts and announcements",      status: "pending" },
  { name: "fetch_github", label: "Fetch GitHub",         message: "Repository READMEs from tracked repos",     status: "pending" },
  { name: "analyse",      label: "Analyse Sources",      message: "Extract research signals via LLM",          status: "pending" },
  { name: "critique",     label: "Critical Review",      message: "Adversarial critique of all analyses",      status: "pending" },
  { name: "gap_map",      label: "Gap Map",              message: "Identify under-explored research directions", status: "pending" },
  { name: "synthesise",   label: "Synthesise Ideas",     message: "Generate candidate ideas from gaps",        status: "pending" },
];
