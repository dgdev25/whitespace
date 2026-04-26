import { useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useIdea } from "../hooks/useIdeas";
import { useSaveIdea, useUnsaveIdea, useSaved } from "../hooks/useSaved";
import { BadgeRow } from "../components/BadgeRow";
import { ConnectedIdeas } from "../components/ConnectedIdeas";
import { ScoreBar } from "../components/ScoreBar";

export function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [surprisePending, setSurprisePending] = useState(false);

  const handleSurprise = async () => {
    setSurprisePending(true);
    try {
      const next = await api.getSurprise();
      navigate(`/ideas/${next.id}`);
    } finally {
      setSurprisePending(false);
    }
  };
  const { data: idea, isLoading, isError } = useIdea(id!);
  const { data: saved } = useSaved();
  const saveIdea = useSaveIdea();
  const unsaveIdea = useUnsaveIdea();

  if (isLoading) return <p style={{ padding: "40px 24px", color: "var(--text-muted)" }}>Loading...</p>;
  if (isError || !idea) return <p style={{ padding: "40px 24px", color: "var(--badge-emerging-text)" }}>Failed to load idea.</p>;

  const isSaved = saved?.some(s => s.idea.id === id);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 48, alignItems: "start", padding: "48px 0 80px" }}>
        {/* Main content */}
        <div>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", padding: 0, marginBottom: 24, cursor: "pointer" }}>
            ← Back to Ideas
          </button>
          <div style={{ marginBottom: 12 }}><BadgeRow badges={[idea.badge]} /></div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: "12px 0 14px", lineHeight: 1.3 }}>
            {idea.title}
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 36 }}>
            {idea.description}
          </p>

          <Section label="Why It's Novel">
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.75 }}>{idea.why_novel}</p>
          </Section>

          <Section label="Analysis">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InfoBox label="Who Builds This" value={idea.who_builds} />
              <InfoBox label="Who Buys This" value={idea.who_buys} />
            </div>
          </Section>

          <Section label={`Research Basis — ${idea.paper_ids.length} Paper${idea.paper_ids.length !== 1 ? "s" : ""}`}>
            {idea.paper_ids.map(pid => (
              <a
                key={pid}
                href={`https://arxiv.org/abs/${pid}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "12px 16px", marginBottom: 8,
                  fontSize: 14, color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <span style={{ color: "var(--accent)", flexShrink: 0 }}>↗</span>
                <span>{pid}</span>
              </a>
            ))}
          </Section>
        </div>

        {/* Sidebar */}
        <aside style={{ position: "sticky", top: 80 }}>
          <SidebarCard title="Scores">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ScoreBar label="Novelty" value={idea.novelty_score} type="novelty" />
              <ScoreBar label="Feasibility" value={idea.feasibility_score} type="feasibility" />
            </div>
          </SidebarCard>

          <SidebarCard title="Actions">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => isSaved ? unsaveIdea.mutate(id!) : saveIdea.mutate(id!)}
                style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 8, fontSize: 14, fontWeight: 500, padding: "8px 16px" }}
              >
                {isSaved ? "Saved ✓" : "Save Idea"}
              </button>
              <button
                onClick={() => navigate(`/ideas/${id}/build`)}
                style={{ width: "100%", background: "var(--accent)", border: "none", color: "white", borderRadius: 8, fontSize: 14, fontWeight: 600, padding: "8px 16px" }}
              >
                Build Plan →
              </button>
            </div>
          </SidebarCard>

          {idea.connections.length > 0 && (
            <SidebarCard title="Connected Ideas">
              <ConnectedIdeas ideas={idea.connections} />
            </SidebarCard>
          )}

          <button
            onClick={handleSurprise}
            disabled={surprisePending}
            style={{ width: "100%", marginTop: 4, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 8, fontSize: 14, fontWeight: 500, padding: "8px 16px", cursor: surprisePending ? "default" : "pointer" }}
          >
            {surprisePending ? "…" : "↻ Surprise me"}
          </button>
        </aside>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
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

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  );
}
