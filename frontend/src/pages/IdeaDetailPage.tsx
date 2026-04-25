import type { ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useIdea } from "../hooks/useIdeas";
import { useSaveIdea, useUnsaveIdea, useSaved } from "../hooks/useSaved";
import { BadgeRow } from "../components/BadgeRow";
import { ConnectedIdeas } from "../components/ConnectedIdeas";

export function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: idea, isLoading, isError } = useIdea(id!);
  const { data: saved } = useSaved();
  const saveIdea = useSaveIdea();
  const unsaveIdea = useUnsaveIdea();

  if (isLoading) return <p style={{ padding: 20, color: "var(--text-muted)" }}>Loading...</p>;
  if (isError) return <p style={{ padding: 20, color: "var(--badge-emerging-text)" }}>Failed to load idea.</p>;
  if (!idea) return <p style={{ padding: 20 }}>Idea not found.</p>;

  const isSaved = saved?.some(s => s.idea.id === id);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", minHeight: "calc(100vh - 44px)" }}>
      <div style={{ padding: 20, borderRight: "1px solid var(--border)", overflow: "auto" }}>
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 10, padding: 0 }}>
            ← Back
          </button>
        </div>
        <div style={{ marginBottom: 10 }}><BadgeRow badges={[idea.badge]} /></div>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 10 }}>{idea.title}</h1>
        <p style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>{idea.description}</p>

        <Section label="WHY THIS IS NOVEL" color="var(--accent)">
          <p style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.6 }}>{idea.why_novel}</p>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <InfoBox label="WHO BUILDS THIS" value={idea.who_builds} />
          <InfoBox label="WHO BUYS IT" value={idea.who_buys} />
        </div>

        <Section label={`RESEARCH BASIS — ${idea.paper_ids.length} PAPERS`} color="var(--text-muted)">
          {idea.paper_ids.map(pid => (
            <div key={pid} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: 8, marginBottom: 6, fontSize: 9, color: "var(--text-secondary)" }}>
              {pid}
            </div>
          ))}
        </Section>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={() => isSaved ? unsaveIdea.mutate(id!) : saveIdea.mutate(id!)} style={{
            background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)",
            fontSize: 9, padding: "6px 14px", borderRadius: 4,
          }}>
            {isSaved ? "Saved ✓" : "Save"}
          </button>
          <button onClick={() => navigate(`/ideas/${id}/build`)} style={{
            background: "var(--text-primary)", border: "none", color: "var(--bg)",
            fontSize: 9, padding: "6px 14px", borderRadius: 4, fontWeight: 600,
          }}>
            Build Plan →
          </button>
        </div>
      </div>

      <div style={{ padding: 16, background: "var(--bg)", overflow: "auto" }}>
        <ConnectedIdeas ideas={idea.connections} />
        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <button onClick={() => navigate("/ideas/surprise")} style={{
            width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
            color: "var(--text-muted)", fontSize: 9, padding: 8, borderRadius: 4,
          }}>
            ↻ Surprise me
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, color, children }: { label: string; color: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 9, color, letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {children}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: 10 }}>
      <p style={{ fontSize: 8, color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.5 }}>{value}</p>
    </div>
  );
}
