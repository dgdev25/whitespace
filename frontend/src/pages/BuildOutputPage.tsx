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

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => setTab(t)} style={{
      padding: "9px 14px", fontSize: 10, cursor: "pointer",
      fontWeight: tab === t ? 600 : 400,
      color: tab === t ? "var(--accent)" : "var(--text-muted)",
      background: "none", border: "none",
      borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
    }}>
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => navigate(`/ideas/${id}`)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 10 }}>← Back to idea</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a href={`/api/export/${id}/markdown`} download style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 9, padding: "4px 10px", borderRadius: 4 }}>Export MD</a>
          <a href={`/api/export/${id}/pdf`} download style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 9, padding: "4px 10px", borderRadius: 4 }}>Export PDF</a>
        </div>
      </div>

      {idea && (
        <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "12px 16px" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{idea.title}</h2>
        </div>
      )}

      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 16px" }}>
        {tabBtn("sketch", "PRODUCT SKETCH")}
        {tabBtn("plan", "TECHNICAL PLAN")}
      </div>

      {isLoading && <p style={{ padding: 20, color: "var(--text-muted)" }}>Loading...</p>}

      {isError && !generate.isPending && (
        <div style={{ padding: 20 }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 12 }}>No build plan yet.</p>
          <button onClick={() => generate.mutate(id!)} style={{ background: "var(--text-primary)", border: "none", color: "var(--bg)", fontSize: 10, padding: "8px 16px", borderRadius: 4 }}>
            Generate Build Plan
          </button>
        </div>
      )}

      {build?.status === "generating" && (
        <p style={{ padding: 20, color: "var(--text-muted)" }}>Generating — this takes 30–120 seconds...</p>
      )}

      {build?.status === "ready" && tab === "sketch" && <ProductSketch sketch={build.product_sketch} />}

      {build?.status === "ready" && tab === "plan" && (
        <div style={{ padding: 20, fontSize: 11, color: "var(--text-primary)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
          {build.technical_plan}
        </div>
      )}
    </div>
  );
}
