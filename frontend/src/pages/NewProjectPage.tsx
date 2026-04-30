import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateProject } from "../hooks/useProjects";
import { IconAI, IconBio, IconGlobe, IconTrendingUp, IconAtom, IconSparkle, IconCheck } from "../components/Icons";

type Domain = "ai" | "biomedical" | "climate" | "finance" | "materials" | "custom";

const DOMAINS: { key: Domain; icon: React.ReactNode; label: string; desc: string }[] = [
  { key: "ai",         icon: <IconAI size={22} />,          label: "AI / ML",    desc: "Foundation models, agents, alignment, LLM infrastructure" },
  { key: "biomedical", icon: <IconBio size={22} />,         label: "Biomedical",  desc: "Genomics, drug discovery, clinical research, multi-omics" },
  { key: "climate",    icon: <IconGlobe size={22} />,       label: "Climate",     desc: "Carbon capture, energy, climate modelling, adaptation" },
  { key: "finance",    icon: <IconTrendingUp size={22} />,  label: "Finance",     desc: "Quantitative research, market microstructure, risk models" },
  { key: "materials",  icon: <IconAtom size={22} />,        label: "Materials",   desc: "Novel materials, synthesis pathways, battery chemistry" },
  { key: "custom",     icon: <IconSparkle size={22} />,     label: "Custom",      desc: "Define your own domain, sources and prompt context" },
];

type SourceDef = { key: string; label: string; description: string; tags: string[]; default: boolean };

const DOMAIN_SOURCES: Record<Domain, SourceDef[]> = {
  ai: [
    { key: "arxiv",           label: "arXiv",              description: "Research papers from configured AI lab organizations.", tags: ["Papers", "AI/ML"],      default: true },
    { key: "semantic_scholar", label: "Semantic Scholar",   description: "Academic papers from top AI research institutions.",   tags: ["Papers", "Citations"],  default: true },
    { key: "blogs",            label: "Research Blogs",     description: "Blog posts from Anthropic, DeepMind, OpenAI, xAI.",   tags: ["Posts", "Industry"],    default: true },
    { key: "acl_anthology",    label: "ACL Anthology",      description: "NLP papers from ACL, EMNLP, NAACL, COLING.",          tags: ["NLP", "Papers"],        default: false },
    { key: "open_alex",        label: "OpenAlex",           description: "Broad academic coverage with keyword-based search.",   tags: ["Papers", "Broad"],      default: false },
    { key: "github",           label: "GitHub",             description: "Repository READMEs from tracked repos and orgs.",      tags: ["Code", "Tools"],        default: false },
  ],
  biomedical: [
    { key: "arxiv",            label: "arXiv (q-bio)",      description: "Quantitative biology and bioinformatics preprints.",   tags: ["Preprints", "q-bio"],   default: true },
    { key: "semantic_scholar", label: "Semantic Scholar",   description: "Academic papers with strong biomedical coverage.",     tags: ["Papers", "Citations"],  default: true },
    { key: "open_alex",        label: "OpenAlex",           description: "Broad search including PubMed-indexed literature.",    tags: ["Papers", "Broad"],      default: true },
    { key: "github",           label: "GitHub (Lab Repos)", description: "Bioinformatics tools from Broad Institute, EMBL.",    tags: ["Code", "Tools"],        default: false },
  ],
  climate: [
    { key: "arxiv",            label: "arXiv (EES)",        description: "Earth and Environmental Science preprints.",           tags: ["Preprints"],            default: true },
    { key: "open_alex",        label: "OpenAlex",           description: "Broad academic search including climate journals.",     tags: ["Papers", "Broad"],      default: true },
    { key: "semantic_scholar", label: "Semantic Scholar",   description: "Academic papers with climate and energy focus.",       tags: ["Papers"],               default: true },
    { key: "github",           label: "GitHub (Models)",    description: "Climate modelling and energy system repositories.",    tags: ["Code", "Models"],       default: false },
  ],
  finance: [
    { key: "arxiv",            label: "arXiv (q-fin)",      description: "Quantitative Finance preprints.",                      tags: ["Quant", "Preprints"],   default: true },
    { key: "open_alex",        label: "OpenAlex",           description: "Broad academic search including economics journals.",   tags: ["Papers"],               default: true },
    { key: "semantic_scholar", label: "Semantic Scholar",   description: "Finance and economics research papers.",               tags: ["Papers"],               default: true },
  ],
  materials: [
    { key: "arxiv",            label: "arXiv (cond-mat)",   description: "Condensed matter and materials science preprints.",    tags: ["Preprints"],            default: true },
    { key: "semantic_scholar", label: "Semantic Scholar",   description: "Materials and chemistry research papers.",             tags: ["Papers"],               default: true },
    { key: "open_alex",        label: "OpenAlex",           description: "Broad materials and chemistry academic coverage.",     tags: ["Papers", "Broad"],      default: false },
    { key: "github",           label: "GitHub (Simulation)", description: "Molecular dynamics and materials simulation repos.", tags: ["Code", "Simulation"],  default: false },
  ],
  custom: [
    { key: "arxiv",            label: "arXiv",              description: "Open-access preprint server for STEM fields.",         tags: ["Papers"],               default: true },
    { key: "semantic_scholar", label: "Semantic Scholar",   description: "Academic papers with citations.",                      tags: ["Papers"],               default: true },
    { key: "open_alex",        label: "OpenAlex",           description: "Broad academic coverage with keyword search.",         tags: ["Papers", "Broad"],      default: false },
    { key: "github",           label: "GitHub",             description: "Repository READMEs and code documentation.",          tags: ["Code"],                 default: false },
  ],
};

const DEFAULT_PIPELINE = (domain: Domain): Record<string, number> => {
  const base = { ideas_per_run: 8, max_sources_per_run: 40, cached_analyses_count: 30 };
  if (domain === "ai") return { ...base, max_sources_per_run: 50 };
  return base;
};

const DOMAIN_ARXIV_CONFIG: Record<Domain, { categories: string[]; orgs: string[] | null }> = {
  ai:         { categories: ["cs.AI", "cs.LG", "cs.CL", "cs.MA", "cs.NE", "cs.RO", "stat.ML"], orgs: ["DeepMind", "Anthropic", "OpenAI"] },
  biomedical: { categories: ["q-bio.NC", "q-bio.GN", "q-bio.QM", "q-bio.MN", "stat.ML", "cs.LG"], orgs: null },
  climate:    { categories: ["physics.ao-ph", "eess.SP", "cs.LG", "stat.AP", "math.OC"], orgs: null },
  finance:    { categories: ["q-fin.TR", "q-fin.PM", "q-fin.RM", "q-fin.CP", "cs.LG", "stat.ML"], orgs: null },
  materials:  { categories: ["cond-mat.mtrl-sci", "cond-mat.soft", "physics.chem-ph", "cs.LG"], orgs: null },
  custom:     { categories: [], orgs: null },
};

const DOMAIN_COLOR: Record<Domain, string> = {
  ai: "#6366f1", biomedical: "var(--domain-bio)", climate: "var(--domain-climate)",
  finance: "var(--domain-finance)", materials: "var(--domain-materials)", custom: "var(--accent)",
};

const AUTO_INTERVAL_OPTIONS = [
  { label: "Every 6 hours", value: 360 },
  { label: "Every 12 hours", value: 720 },
  { label: "Every 24 hours", value: 1440 },
  { label: "Manual only", value: 0 },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ["Domain", "Sources", "Focus", "Confirm"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
      {labels.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {i > 0 && (
              <div style={{ flex: "0 0 40px", height: 1, background: isDone ? "var(--domain-bio)" : "var(--border)", margin: "0 8px" }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600,
                background: isDone ? "rgba(34,197,94,0.12)" : isActive ? "var(--accent)" : "var(--surface2)",
                color: isDone ? "#4ade80" : isActive ? "white" : "var(--text-muted)",
                border: isDone ? "1px solid rgba(34,197,94,0.3)" : isActive ? "none" : "1px solid var(--border)",
              }}>
                {isDone ? <IconCheck size={12} /> : stepNum}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: isDone ? "#4ade80" : isActive ? "var(--text-primary)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 0 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" };
const primaryBtn: React.CSSProperties = { padding: "10px 20px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const ghostBtn: React.CSSProperties = { padding: "10px 20px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };

export function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const [step, setStep] = useState(1);
  const [createError, setCreateError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState<Domain | null>(null);
  const [enabledSources, setEnabledSources] = useState<Record<string, boolean>>({});
  const [focusStatement, setFocusStatement] = useState("");
  const [ideasPerRun, setIdeasPerRun] = useState(8);
  const [maxSources, setMaxSources] = useState(40);
  const [cachedCount, setCachedCount] = useState(30);
  const [intervalVal, setIntervalVal] = useState(720);

  const activeDomain = domain ?? "ai";
  const sources = DOMAIN_SOURCES[activeDomain];

  function getEnabled(key: string): boolean {
    if (key in enabledSources) return enabledSources[key];
    return sources.find(s => s.key === key)?.default ?? false;
  }

  function goStep2() {
    if (!domain) return;
    const defaults: Record<string, boolean> = {};
    DOMAIN_SOURCES[domain].forEach(s => { defaults[s.key] = s.default; });
    setEnabledSources(defaults);
    const defPip = DEFAULT_PIPELINE(domain);
    setIdeasPerRun(defPip.ideas_per_run);
    setMaxSources(defPip.max_sources_per_run);
    setCachedCount(defPip.cached_analyses_count);
    setStep(2);
  }

  async function handleCreate() {
    if (!domain || !name.trim()) return;
    setCreateError(null);
    const arxivCfg = DOMAIN_ARXIV_CONFIG[domain];
    const sourceConfig = {
      enabled_sources: enabledSources,
      orgs: arxivCfg.orgs,
      categories: arxivCfg.categories.length > 0 ? arxivCfg.categories : null,
      github_repos: [],
    };
    const pipelineConfig = {
      ideas_per_run: ideasPerRun,
      max_sources_per_run: maxSources,
      cached_analyses_count: cachedCount,
      interval_minutes: intervalVal || null,
    };
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        domain,
        description: "",
        focus_statement: focusStatement.trim() || undefined,
        source_config: sourceConfig,
        pipeline_config: pipelineConfig,
      });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project — check that the backend is running.");
    }
  }

  const domainColor = domain ? DOMAIN_COLOR[domain] : "var(--accent)";
  const enabledCount = sources.filter(s => getEnabled(s.key)).length;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px 100px" }}>
      <button onClick={() => navigate("/projects")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginBottom: 24, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
        ← Back to Projects
      </button>

      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.4, marginBottom: 6 }}>New Project</h1>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 32 }}>
        Define a research domain and configure sources to start synthesising ideas.
      </p>

      <StepIndicator current={step} total={4} />

      {/* Step 1 — Domain */}
      {step === 1 && (
        <div style={card}>
          <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Project Name</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>Give your project a descriptive name.</p>
          </div>
          <input
            className="project-input"
            style={inputStyle}
            placeholder="e.g. Drug Discovery, Climate Tech, Quant Finance…"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Research Domain</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Select the domain. This shapes which sources and prompt templates are used.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {DOMAINS.map(d => {
              const isSelected = domain === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => setDomain(d.key)}
                  style={{
                    background: isSelected ? `${DOMAIN_COLOR[d.key]}20` : "var(--surface2)",
                    border: `2px solid ${isSelected ? DOMAIN_COLOR[d.key] : "var(--border)"}`,
                    borderRadius: 10, padding: 16, cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ marginBottom: 8, display: "flex", color: "var(--text-secondary)" }}>{d.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>{d.desc}</div>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button onClick={goStep2} disabled={!domain || !name.trim()} style={{ ...primaryBtn, opacity: (!domain || !name.trim()) ? 0.5 : 1 }}>
              Continue → Sources
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Sources */}
      {step === 2 && (
        <div style={card}>
          <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Data Sources</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{enabledCount} of {sources.length} selected for {DOMAINS.find(d => d.key === domain)?.label}</p>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${domainColor}20`, color: domainColor, border: `1px solid ${domainColor}50` }}>
              {DOMAINS.find(d => d.key === domain)?.label}
            </span>
          </div>

          {sources.map((src, i) => (
            <div key={src.key} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "14px 0", borderBottom: i < sources.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{src.label}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{src.description}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {src.tags.map(t => (
                    <span key={t} style={{ background: getEnabled(src.key) ? "var(--domain-ai-dim)" : "var(--surface2)", border: `1px solid ${getEnabled(src.key) ? "var(--domain-ai-border)" : "var(--border)"}`, color: getEnabled(src.key) ? "var(--domain-ai-text)" : "var(--text-muted)", padding: "2px 8px", borderRadius: 999, fontSize: 11 }}>{t}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setEnabledSources(prev => ({ ...prev, [src.key]: !getEnabled(src.key) }))}
                style={{ width: 44, height: 24, borderRadius: 999, border: "none", padding: 0, background: getEnabled(src.key) ? "var(--accent)" : "var(--border)", position: "relative", flexShrink: 0, cursor: "pointer", transition: "background 0.2s", marginTop: 2 }}
              >
                <span style={{ position: "absolute", top: 3, left: getEnabled(src.key) ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s" }} />
              </button>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={ghostBtn}>← Back</button>
            <button onClick={() => setStep(3)} style={primaryBtn}>Continue → Focus</button>
          </div>
        </div>
      )}

      {/* Step 3 — Focus + Pipeline Config */}
      {step === 3 && (
        <div style={card}>
          <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Research Focus</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>Optional context injected into the synthesis prompt to bias idea generation toward your goals.</p>
          </div>

          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>What should ideas prioritise?</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: "vertical" } as React.CSSProperties}
            placeholder="e.g. Focus on non-invasive biomarker approaches for early-stage neurodegenerative disease detection…"
            value={focusStatement}
            onChange={e => setFocusStatement(e.target.value)}
          />
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
            This text is appended to the synthesis prompt. Be specific — vague goals produce generic ideas.
          </p>

          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Pipeline Settings</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { label: "Ideas per Run", value: ideasPerRun, set: setIdeasPerRun, min: 1 },
              { label: "Max Sources per Run", value: maxSources, set: setMaxSources, min: 1 },
              { label: "Cached Analyses", value: cachedCount, set: setCachedCount, min: 0 },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{f.label}</label>
                <input type="number" min={f.min} value={f.value} onChange={e => f.set(Math.max(f.min, parseInt(e.target.value) || f.min))} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Auto-Run Interval</label>
              <select value={intervalVal} onChange={e => setIntervalVal(Number(e.target.value))} style={{ ...inputStyle, cursor: "pointer" }}>
                {AUTO_INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={ghostBtn}>← Back</button>
            <button onClick={() => setStep(4)} style={primaryBtn}>Review & Create →</button>
          </div>
        </div>
      )}

      {/* Step 4 — Confirm */}
      {step === 4 && (
        <>
          <div style={{ ...card, borderColor: "var(--domain-ai-border)", background: "var(--domain-ai-dim)" }}>
            <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Project Summary</h3>
              <span style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                Ready to create
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
              <div>
                <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Name</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Domain</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${domainColor}20`, color: domainColor, border: `1px solid ${domainColor}50` }}>
                  {DOMAINS.find(d => d.key === domain)?.label}
                </span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Sources</span>
                <span style={{ fontSize: 14 }}>{enabledCount} active</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Auto-Run</span>
                <span style={{ fontSize: 14 }}>{AUTO_INTERVAL_OPTIONS.find(o => o.value === intervalVal)?.label ?? "Manual only"}</span>
              </div>
              {focusStatement && (
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Focus</span>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {focusStatement.length > 120 ? focusStatement.slice(0, 120) + "…" : focusStatement}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button onClick={() => setStep(3)} style={ghostBtn}>← Back</button>
            <button
              onClick={handleCreate}
              disabled={createProject.isPending}
              style={{ ...primaryBtn, opacity: createProject.isPending ? 0.7 : 1 }}
            >
              {createProject.isPending ? "Creating…" : "Create Project & Run Pipeline →"}
            </button>
          </div>
          {createError && (
            <p style={{ marginTop: 12, fontSize: 13, color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px" }}>
              {createError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
