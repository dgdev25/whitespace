import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBuild, useGenerateBuild } from "../hooks/useBuild";
import { useIdea } from "../hooks/useIdeas";
import { ProductSketch } from "../components/ProductSketch";

type Tab = "sketch" | "plan";

export function BuildOutputPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("sketch");
  const { data: idea } = useIdea(id!);
  const { data: build, isLoading, isError } = useBuild(id!);
  const generate = useGenerateBuild();

  const tabStyle = (t: Tab) => ({
    padding: "14px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer" as const,
    color: tab === t ? "var(--accent)" : "var(--text-muted)",
    background: "none",
    border: "none",
    borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
    marginBottom: -1,
  });

  return (
    <div>
      {/* Top bar */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigate(`/ideas/${id}`)} style={{ background: "none", border: "none", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", cursor: "pointer" }}>
          ← Back to idea
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a href={`/api/export/${id}/markdown`} download style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, padding: "6px 14px", borderRadius: 8, textDecoration: "none" }}>
            Export MD
          </a>
          <a href={`/api/export/${id}/pdf`} download style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, padding: "6px 14px", borderRadius: 8, textDecoration: "none" }}>
            Export PDF
          </a>
        </div>
      </div>

      {/* Title bar */}
      {idea && (
        <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "16px 24px" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Build Plan</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{idea.title}</h1>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 24px" }}>
        <button style={tabStyle("sketch")} onClick={() => setTab("sketch")}>Product Sketch</button>
        <button style={tabStyle("plan")} onClick={() => setTab("plan")}>Technical Plan</button>
      </div>

      {/* Content */}
      {isLoading && (
        <p style={{ padding: "40px 24px", color: "var(--text-muted)" }}>Loading...</p>
      )}

      {isError && !generate.isPending && (
        <div style={{ padding: "80px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 16, marginBottom: 20 }}>No build plan yet.</p>
          <button
            onClick={() => generate.mutate(id!)}
            style={{ background: "var(--accent)", border: "none", color: "white", fontSize: 14, fontWeight: 600, padding: "10px 24px", borderRadius: 8, cursor: "pointer" }}
          >
            Generate Build Plan
          </button>
        </div>
      )}

      {(build?.status === "generating" || generate.isPending) && (
        <div style={{ padding: "100px 24px", textAlign: "center" }}>
          <div style={{
            width: 28, height: 28, margin: "0 auto 20px",
            border: "3px solid var(--border)", borderTopColor: "var(--accent)",
            borderRadius: "50%", animation: "spin 0.9s linear infinite",
          }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Generating your build plan</h3>
          <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>This takes 30–120 seconds. Sit tight.</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {build?.status === "ready" && tab === "sketch" && (
        <ProductSketch sketch={build.product_sketch} />
      )}

      {build?.status === "ready" && tab === "plan" && (
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px 80px" }}>
          <pre style={{
            padding: 24, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.9,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
          }}>
            {build.technical_plan}
          </pre>
        </div>
      )}
    </div>
  );
}
