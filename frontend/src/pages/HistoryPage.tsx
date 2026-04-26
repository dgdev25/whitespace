import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHistory } from "../hooks/useIdeas";
import type { Badge, IdeaSummary } from "../api/types";

const BADGES: Badge[] = ["novel", "feasible", "speculative", "emerging"];

type SortKey = "title" | "novelty_score" | "feasibility_score" | "date";
type SortDir = "asc" | "desc";

interface Row extends IdeaSummary {
  date: string;
  run_label: string;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function scoreColor(v: number) {
  if (v >= 0.7) return "var(--badge-novel-text)";
  if (v >= 0.45) return "var(--badge-feasible-text)";
  return "var(--text-muted)";
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: 10 }}>
      {active ? (dir === "asc" ? "▲" : "▼") : "▲▼"}
    </span>
  );
}

export function HistoryPage() {
  const navigate = useNavigate();
  const { data: groups, isLoading, isError } = useHistory();

  const [search, setSearch] = useState("");
  const [badge, setBadge] = useState<Badge | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo<Row[]>(() => {
    if (!groups) return [];
    return groups.flatMap(g =>
      g.ideas.map(idea => ({ ...idea, date: g.date, run_label: g.run_label }))
    );
  }, [groups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => !badge || r.badge === badge)
      .filter(r => !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "title") cmp = a.title.localeCompare(b.title);
        else if (sortKey === "novelty_score") cmp = a.novelty_score - b.novelty_score;
        else if (sortKey === "feasibility_score") cmp = a.feasibility_score - b.feasibility_score;
        else cmp = a.date.localeCompare(b.date);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [rows, search, badge, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const th: React.CSSProperties = {
    padding: "10px 14px", fontSize: 12, fontWeight: 600,
    color: "var(--text-muted)", textAlign: "left",
    borderBottom: "2px solid var(--border)", whiteSpace: "nowrap",
    cursor: "pointer", userSelect: "none", background: "var(--surface)",
    position: "sticky", top: 0, zIndex: 1,
  };

  if (isLoading) return <p style={{ padding: "40px 24px", color: "var(--text-muted)" }}>Loading history…</p>;
  if (isError || !groups) return <p style={{ padding: "40px 24px", color: "var(--badge-emerging-text)" }}>Failed to load history.</p>;

  const totalRuns = groups.length;
  const totalIdeas = rows.length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>History</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          {totalRuns} run{totalRuns !== 1 ? "s" : ""} · {totalIdeas} idea{totalIdeas !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search ideas…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: "8px 12px", fontSize: 13, borderRadius: 8,
            border: "1px solid var(--border)", background: "var(--bg)",
            color: "var(--text-primary)", fontFamily: "inherit", width: 220,
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <FilterChip label="All" active={badge === null} onClick={() => setBadge(null)} />
          {BADGES.map(b => (
            <FilterChip key={b} label={b} active={badge === b} onClick={() => setBadge(b === badge ? null : b)} />
          ))}
        </div>
        {(search || badge) && (
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{
        border: "1px solid var(--border)", borderRadius: 12,
        overflow: "hidden", overflowX: "auto",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 110 }}>Badge</th>
              <th style={th} onClick={() => handleSort("title")}>
                Title <SortIcon active={sortKey === "title"} dir={sortDir} />
              </th>
              <th style={{ ...th, width: 100, textAlign: "right" }} onClick={() => handleSort("novelty_score")}>
                Novelty <SortIcon active={sortKey === "novelty_score"} dir={sortDir} />
              </th>
              <th style={{ ...th, width: 110, textAlign: "right" }} onClick={() => handleSort("feasibility_score")}>
                Feasibility <SortIcon active={sortKey === "feasibility_score"} dir={sortDir} />
              </th>
              <th style={{ ...th, width: 130, textAlign: "right" }} onClick={() => handleSort("date")}>
                Date <SortIcon active={sortKey === "date"} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                  No ideas match the current filters.
                </td>
              </tr>
            ) : filtered.map((row, i) => (
              <tr
                key={row.id}
                onClick={() => navigate(`/ideas/${row.id}`)}
                style={{
                  background: i % 2 === 0 ? "var(--surface)" : "var(--bg)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  borderBottom: "1px solid var(--border)",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover, var(--border))")}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "var(--surface)" : "var(--bg)")}
              >
                <td style={{ padding: "10px 14px" }}>
                  <span style={{
                    background: `var(--badge-${row.badge}-bg)`,
                    color: `var(--badge-${row.badge}-text)`,
                    fontSize: 11, fontWeight: 500,
                    padding: "3px 8px", borderRadius: 999,
                    textTransform: "capitalize", whiteSpace: "nowrap",
                  }}>
                    {row.badge}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.4 }}>
                  <span style={{
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {row.title}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: scoreColor(row.novelty_score) }}>
                  {row.novelty_score.toFixed(2)}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: scoreColor(row.feasibility_score) }}>
                  {row.feasibility_score.toFixed(2)}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {formatDate(row.date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
        background: active ? "var(--accent)" : "var(--bg)",
        border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
        color: active ? "white" : "var(--text-muted)",
        cursor: "pointer", textTransform: "capitalize",
      }}
    >
      {label}
    </button>
  );
}
