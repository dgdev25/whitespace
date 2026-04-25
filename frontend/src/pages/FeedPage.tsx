import { useToday } from "../hooks/useIdeas";
import { HeroCard } from "../components/HeroCard";
import { IdeaCard } from "../components/IdeaCard";

export function FeedPage() {
  const { data, isLoading, error } = useToday();

  if (isLoading) return <p style={{ padding: 20, color: "var(--text-muted)" }}>Loading today's ideas...</p>;
  if (error) return <p style={{ padding: 20, color: "var(--badge-emerging-text)" }}>Failed to load feed.</p>;
  if (!data || data.ideas.length === 0) return (
    <div style={{ padding: 20 }}>
      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>No ideas yet — the worker runs at 02:00 or on first start.</p>
    </div>
  );

  const [featured, ...rest] = data.ideas;

  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ padding: "16px 0 10px", display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5 }}>
          {new Date(data.date).toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          · {data.ideas.length} ideas from {data.papers_ingested} new papers
        </span>
      </div>
      <div style={{ marginBottom: 14 }}><HeroCard idea={featured} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {rest.map(idea => <IdeaCard key={idea.id} idea={idea} />)}
      </div>
    </div>
  );
}
