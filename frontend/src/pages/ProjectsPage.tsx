import { useNavigate } from "react-router-dom";
import { useProjects, useDeleteProject } from "../hooks/useProjects";
import { IconSparkle } from "../components/Icons";
import type { Project } from "../api/types";

const DOMAIN_META: Record<string, { label: string; colorVar: string; dimVar: string; borderVar: string; textVar: string }> = {
  ai:         { label: "AI / ML",    colorVar: "--domain-ai",        dimVar: "--domain-ai-dim",        borderVar: "--domain-ai-border",        textVar: "--domain-ai-text" },
  biomedical: { label: "Biomedical", colorVar: "--domain-bio",       dimVar: "--domain-bio-dim",       borderVar: "--domain-bio-border",       textVar: "--domain-bio-text" },
  climate:    { label: "Climate",    colorVar: "--domain-climate",   dimVar: "--domain-climate-dim",   borderVar: "--domain-climate-border",   textVar: "--domain-climate-text" },
  finance:    { label: "Finance",    colorVar: "--domain-finance",   dimVar: "--domain-finance-dim",   borderVar: "--domain-finance-border",   textVar: "--domain-finance-text" },
  materials:  { label: "Materials",  colorVar: "--domain-materials", dimVar: "--domain-materials-dim", borderVar: "--domain-materials-border", textVar: "--domain-materials-text" },
  custom:     { label: "Custom",     colorVar: "--domain-ai",        dimVar: "--domain-ai-dim",        borderVar: "--domain-ai-border",        textVar: "--domain-ai-text" },
};

function domainMeta(domain: string) {
  return DOMAIN_META[domain] ?? DOMAIN_META.custom;
}

function StatusBadge({ run }: { run: Project["last_run"] }) {
  if (!run) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
        Idle
      </span>
    );
  }
  if (run.status === "running") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--domain-ai-dim)", color: "var(--domain-ai-text)", border: "1px solid var(--domain-ai-border)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", animation: "pulse 1.5s ease-in-out infinite" }} />
        Running
      </span>
    );
  }
  if (run.status === "error") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
        Error
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      Up to date
    </span>
  );
}

function DomainBadge({ domain }: { domain: string }) {
  const m = domainMeta(domain);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      background: `var(${m.dimVar})`,
      color: `var(${m.textVar})`,
      border: `1px solid var(${m.borderVar})`,
    }}>
      {m.label}
    </span>
  );
}

function lastRunLabel(run: Project["last_run"]): string {
  if (!run) return "Never run";
  const d = new Date(run.started_at);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function sourceCount(project: Project): number {
  const e = project.source_config?.enabled_sources ?? {};
  return Object.values(e).filter(Boolean).length || 3;
}

function ProjectCard({ project, onOpen, onDelete }: { project: Project; onOpen: () => void; onDelete: () => void }) {
  const m = domainMeta(project.domain);
  return (
    <div
      onClick={onOpen}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
        padding: 22, cursor: "pointer", transition: "all 0.2s", position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `var(${m.colorVar})` }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <DomainBadge domain={project.domain} />
        <StatusBadge run={project.last_run} />
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{project.name}</h2>
      {project.description && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 0 }}>
          {project.description.length > 90 ? project.description.slice(0, 90) + "…" : project.description}
        </p>
      )}

      <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{project.ideas_count}</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Ideas</p>
        </div>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{sourceCount(project)}</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Sources</p>
        </div>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{project.papers_count || "—"}</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Papers</p>
        </div>
      </div>

      {project.last_run?.status === "running" && (
        <div style={{ height: 4, borderRadius: 2, background: "var(--surface2)", overflow: "hidden", marginBottom: 8 }}>
          <div style={{ height: "100%", borderRadius: 2, background: `var(${m.colorVar})`, width: "45%", animation: "shimmer 1.5s ease-in-out infinite" }} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {project.last_run?.status === "running" ? "Running now…" : `Last run ${lastRunLabel(project.last_run)}`}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: "2px 6px", borderRadius: 4 }}
          aria-label="Delete project"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();

  const totalIdeas = projects?.reduce((s, p) => s + p.ideas_count, 0) ?? 0;
  const totalPapers = projects?.reduce((s, p) => s + p.papers_count, 0) ?? 0;
  const activeToday = projects?.filter(p => {
    if (!p.last_run?.started_at) return false;
    return new Date(p.last_run.started_at).toDateString() === new Date().toDateString();
  }).length ?? 0;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 100px" }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes shimmer { 0% { transform:translateX(-100%) } 100% { transform:translateX(250%) } }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -0.4 }}>Projects</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
            Each project targets a domain with its own sources, prompts, and idea pipeline.
          </p>
        </div>
        <button
          onClick={() => navigate("/projects/new")}
          style={{ padding: "9px 18px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
        >
          + New Project
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 28px", marginBottom: 24, display: "flex", gap: 0 }}>
        {[
          { value: String(projects?.length ?? 0), label: "Projects" },
          { value: String(totalIdeas), label: "Total Ideas" },
          { value: String(totalPapers || "—"), label: "Sources Indexed" },
          { value: String(activeToday), label: "Active Today", highlight: true },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 0, flex: i < 3 ? "0 0 auto" : 1 }}>
            {i > 0 && <div style={{ width: 1, height: 36, background: "var(--border)", margin: "0 28px" }} />}
            <div>
              <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: s.highlight ? "var(--domain-bio)" : "var(--text-primary)", lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 500 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Project grid */}
      {isLoading ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading projects…</p>
      ) : projects && projects.length > 0 ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => navigate(`/projects/${p.id}`)}
                onDelete={() => { if (confirm(`Delete "${p.name}"?`)) deleteProject.mutate(p.id); }}
              />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={() => navigate("/projects/new")}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 20px", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}
            >
              + Add another project
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>
          <div style={{ marginBottom: 16, color: "var(--text-muted)" }}><IconSparkle size={40} /></div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>No projects yet</h2>
          <p style={{ fontSize: 14, marginBottom: 24 }}>Create your first project to start synthesising domain-specific research ideas.</p>
          <button
            onClick={() => navigate("/projects/new")}
            style={{ padding: "10px 24px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            + New Project
          </button>
        </div>
      )}
    </div>
  );
}
