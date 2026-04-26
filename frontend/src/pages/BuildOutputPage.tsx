import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useBuild, useGenerateBuild } from "../hooks/useBuild";
import { useIdea } from "../hooks/useIdeas";
import { ProductSketch } from "../components/ProductSketch";

type Tab = "overview" | "prd" | "techplan";
const VALID_TABS: Tab[] = ["overview", "prd", "techplan"];

const MD_STYLES = `
  .md-body { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; color: var(--text-primary); line-height: 1.75; font-size: 14px; }
  .md-body h1 { font-size: 22px; font-weight: 700; margin: 0 0 24px; color: var(--text-primary); }
  .md-body h2 { font-size: 17px; font-weight: 700; margin: 36px 0 12px; color: var(--text-primary); border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  .md-body h3 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; color: var(--text-primary); }
  .md-body p { margin: 0 0 14px; }
  .md-body ul, .md-body ol { margin: 0 0 14px; padding-left: 22px; }
  .md-body li { margin-bottom: 6px; }
  .md-body strong { font-weight: 600; }
  .md-body em { font-style: italic; color: var(--text-secondary); }
  .md-body code { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
  .md-body pre { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0 0 16px; }
  .md-body pre code { background: none; border: none; padding: 0; font-size: 12px; }
  .md-body table { width: 100%; border-collapse: collapse; margin: 0 0 16px; font-size: 13px; }
  .md-body th { background: var(--surface); border: 1px solid var(--border); padding: 8px 12px; text-align: left; font-weight: 600; }
  .md-body td { border: 1px solid var(--border); padding: 8px 12px; }
  .md-body tr:nth-child(even) td { background: var(--bg); }
  .md-body hr { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
  .md-body blockquote { border-left: 3px solid var(--accent); margin: 0 0 14px; padding: 4px 16px; color: var(--text-secondary); }
`;

const exportLinkStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
  fontSize: 13,
  fontWeight: 500,
  padding: "6px 14px",
  borderRadius: 8,
  textDecoration: "none",
} as const;

export function BuildOutputPage() {
  const { id, tab: tabParam } = useParams<{ id: string; tab: string }>();
  const navigate = useNavigate();
  const [generatingFor, setGeneratingFor] = useState<"build" | "prd">("build");
  const { data: idea } = useIdea(id!);
  const { data: build, isLoading, isError } = useBuild(id!);
  const generate = useGenerateBuild();

  const tab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "overview";
  const goTab = (t: Tab) => navigate(`/ideas/${id}/build/${t}`, { replace: true });

  const triggerGenerate = (context: "build" | "prd" = "build") => {
    setGeneratingFor(context);
    generate.mutate(id!);
  };

  const isGenerating = build?.status === "generating" || generate.isPending;
  const isFailed = build?.status === "failed" && !generate.isPending;
  const isReady = build?.status === "ready";
  const needsGeneration = (isError || build?.status === "pending") && !generate.isPending;

  // Auto-trigger generation when there's no build yet
  useEffect(() => {
    if (needsGeneration && !isLoading) {
      triggerGenerate("build");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsGeneration, isLoading]);

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
      <style>{MD_STYLES}</style>

      {/* Top bar */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigate(`/ideas/${id}`)} style={{ background: "none", border: "none", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", cursor: "pointer" }}>
          ← Back to idea
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a href={`/api/export/${id}/markdown`} download style={exportLinkStyle}>Export All</a>
          <a href={`/api/export/${id}/pdf`} download style={exportLinkStyle}>Export PDF</a>
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
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 24px" }}>
        <button style={tabStyle("overview")} onClick={() => goTab("overview")}>Overview</button>
        <button style={tabStyle("prd")} onClick={() => goTab("prd")}>PRD</button>
        <button style={tabStyle("techplan")} onClick={() => goTab("techplan")}>Technical Plan</button>
        {isReady && tab === "prd" && build?.prd && (
          <a href={`/api/export/${id}/prd`} download style={{ ...exportLinkStyle, marginLeft: "auto" }}>Export PRD</a>
        )}
        {isReady && tab === "techplan" && build?.technical_plan && (
          <a href={`/api/export/${id}/plan`} download style={{ ...exportLinkStyle, marginLeft: "auto" }}>Export Plan</a>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <p style={{ padding: "40px 24px", color: "var(--text-muted)" }}>Loading...</p>
      )}

      {/* Failed */}
      {isFailed && (
        <EmptyState
          icon="⚠️"
          title="Build generation failed"
          subtitle="The LLM runner returned an unexpected response or timed out."
          action="Retry"
          onAction={() => triggerGenerate("build")}
        />
      )}

      {/* Generating */}
      {isGenerating && (
        <div style={{ padding: "100px 24px", textAlign: "center" }}>
          <div style={{
            width: 28, height: 28, margin: "0 auto 20px",
            border: "3px solid var(--border)", borderTopColor: "var(--accent)",
            borderRadius: "50%", animation: "spin 0.9s linear infinite",
          }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            {generatingFor === "prd" ? "Generating your PRD for this idea" : "Generating your build plan"}
          </h3>
          <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>This takes 30–120 seconds. Sit tight.</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Overview tab */}
      {isReady && tab === "overview" && (
        <ProductSketch sketch={build.product_sketch} />
      )}

      {/* PRD tab */}
      {isReady && tab === "prd" && (
        build.prd ? (
          <div className="md-body">
            <ReactMarkdown>{build.prd}</ReactMarkdown>
          </div>
        ) : (
          <EmptyState
            title="PRD not available"
            subtitle="This build was generated before PRD support was added."
            action="Regenerate"
            onAction={() => triggerGenerate("prd")}
          />
        )
      )}

      {/* Technical Plan tab */}
      {isReady && tab === "techplan" && (
        build.technical_plan ? (
          <div className="md-body">
            <ReactMarkdown>{build.technical_plan}</ReactMarkdown>
          </div>
        ) : (
          <EmptyState
            title="Technical plan not available"
            subtitle="This build was generated before Technical Plan support was added."
            action="Regenerate"
            onAction={() => triggerGenerate("build")}
          />
        )
      )}
    </div>
  );
}

function EmptyState({ icon, title, subtitle, action, onAction }: {
  icon?: string;
  title: string;
  subtitle?: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div style={{ padding: "80px 24px", textAlign: "center" }}>
      {icon && <p style={{ fontSize: 28, marginBottom: 12 }}>{icon}</p>}
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>{subtitle}</p>}
      <button
        onClick={onAction}
        style={{ background: "var(--accent)", border: "none", color: "white", fontSize: 14, fontWeight: 600, padding: "10px 24px", borderRadius: 8, cursor: "pointer", marginTop: subtitle ? 0 : 16 }}
      >
        {action}
      </button>
    </div>
  );
}
