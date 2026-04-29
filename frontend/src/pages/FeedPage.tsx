import { useToday } from "../hooks/useIdeas";
import { HeroCard } from "../components/HeroCard";
import { IdeaCard } from "../components/IdeaCard";

export function FeedPage() {
  const { data, isLoading, error } = useToday();

  if (isLoading && !data) return <p style={{ padding: "40px 24px", color: "var(--text-muted)" }}>Loading today's ideas...</p>;
  if (error && !data) return <p style={{ padding: "40px 24px", color: "var(--badge-emerging-text)" }}>Failed to load feed.</p>;
  if (!data || data.ideas.length === 0) return (
    <div style={{ padding: "40px 24px" }}>
      <p style={{ color: "var(--text-muted)", fontSize: 15 }}>No ideas yet — run the pipeline to generate some.</p>
    </div>
  );

  const [featured, ...rest] = data.ideas;
  const dateStr = new Date(data.date).toLocaleDateString("en-GB", {
    weekday: "long", month: "long", day: "numeric",
  }).toUpperCase();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 60px" }}>
      <header style={{ padding: "48px 0 32px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>Today's Ideas</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            {dateStr} · {data.ideas.length} ideas from {data.papers_ingested} papers
          </p>
        </div>
      </header>
      <HeroCard idea={featured} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        {rest.map(idea => <IdeaCard key={idea.id} idea={idea} />)}
      </div>
    </div>
  );
}
