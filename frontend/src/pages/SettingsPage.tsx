import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useRunners, useSystemConfig, useSetRunner, useSetDataSources, useSchedule, useSetSchedule, useSetPipelineConfig, useSetRunnerModel, useSetGithubRepos, useImportOrg, useOrgImportStatus, useToggleSource } from "../hooks/useIdeas";
import { useThemeStore } from "../store/themeStore";

const RUNNER_MODELS: Record<string, { value: string; label: string }[]> = {
  claude_cli: [
    { value: "claude-opus-4-7", label: "Opus 4.7" },
    { value: "claude-sonnet-4-6", label: "Sonnet 4.6" },
    { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
  ],
  codex_cli: [
    { value: "o4-mini", label: "o4-mini" },
    { value: "o3", label: "o3" },
    { value: "gpt-4o", label: "GPT-4o" },
  ],
  gemini_cli: [
    { value: "gemini-2.5-pro", label: "2.5 Pro" },
    { value: "gemini-2.0-flash", label: "2.0 Flash" },
    { value: "gemini-1.5-pro", label: "1.5 Pro" },
  ],
  anthropic: [
    { value: "claude-opus-4-7", label: "Opus 4.7" },
    { value: "claude-sonnet-4-6", label: "Sonnet 4.6" },
    { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
  ],
  gemini: [
    { value: "gemini-2.5-pro", label: "2.5 Pro" },
    { value: "gemini-2.0-flash", label: "2.0 Flash" },
    { value: "gemini-1.5-pro", label: "1.5 Pro" },
    { value: "gemini-1.5-flash", label: "1.5 Flash" },
  ],
  openrouter: [
    { value: "anthropic/claude-opus-4-7", label: "Claude Opus 4.7" },
    { value: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
    { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "openai/gpt-4o", label: "GPT-4o" },
    { value: "openai/o4-mini", label: "o4-mini" },
  ],
};

type Tab = "runner" | "pipeline" | "feeds" | "appearance";
const VALID_TABS: Tab[] = ["runner", "pipeline", "feeds", "appearance"];
type PipelineTab = "limits" | "schedule";
type FeedsTab = "sources" | "arxiv" | "github";

const FEED_SOURCES: { key: string; label: string; description: string }[] = [
  { key: "arxiv", label: "arXiv", description: "Research papers from configured AI lab organizations." },
  { key: "semantic_scholar", label: "Semantic Scholar", description: "Papers from Anthropic, DeepMind, OpenAI, xAI, Meta AI, and Microsoft Research." },
  { key: "blogs", label: "Research Blogs", description: "Blog posts and announcements from Anthropic, DeepMind, OpenAI, and xAI." },
  { key: "github", label: "GitHub", description: "Repository READMEs from tracked repos and imported orgs." },
  { key: "acl_anthology", label: "ACL Anthology", description: "NLP and CL papers from ACL, EMNLP, NAACL, COLING, and more — fills gaps not covered by arXiv." },
  { key: "open_alex", label: "OpenAlex", description: "Broad academic coverage with keyword-based search across all institutions." },
];

function parseGithubRepoSlug(input: string): string {
  const s = input.trim();
  try {
    const url = new URL(s);
    if (url.hostname === "github.com") {
      const parts = url.pathname.replace(/^\//, "").replace(/\/$/, "").split("/");
      if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    }
  } catch { /* not a URL */ }
  return s;
}

function parseGithubHandle(input: string): string {
  const s = input.trim();
  try {
    const url = new URL(s);
    if (url.hostname === "github.com") {
      const parts = url.pathname.replace(/^\//, "").replace(/\/$/, "").split("/");
      if (parts.length >= 1 && parts[0]) return parts[0];
    }
  } catch { /* not a URL */ }
  return s;
}

export function SettingsPage() {
  const { tab: tabParam } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const tab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "runner";
  const goTab = (t: Tab) => navigate(`/settings/${t}`, { replace: true });

  const { data: runners } = useRunners();
  const { data: config } = useSystemConfig();
  const { data: schedule } = useSchedule();
  const { theme, toggle } = useThemeStore();
  const setRunner = useSetRunner();
  const setRunnerModel = useSetRunnerModel();
  const setDataSources = useSetDataSources();
  const setSchedule = useSetSchedule();
  const setPipelineConfig = useSetPipelineConfig();
  const setGithubRepos = useSetGithubRepos();
  const toggleSource = useToggleSource();
  const importOrg = useImportOrg();
  const { data: orgImport } = useOrgImportStatus();
  const [pipelineTab, setPipelineTab] = useState<PipelineTab>("limits");
  const [feedsTab, setFeedsTab] = useState<FeedsTab>("sources");
  const [orgInput, setOrgInput] = useState<string>("");
  const [scanInitiated, setScanInitiated] = useState(false);
  const [intervalInput, setIntervalInput] = useState<string>("");
  const [ideasPerRunInput, setIdeasPerRunInput] = useState<string>("");
  const [maxSourcesInput, setMaxSourcesInput] = useState<string>("");
  const [cachedCountInput, setCachedCountInput] = useState<string>("");
  const [githubInput, setGithubInput] = useState<string>("");
  const qc = useQueryClient();
  const prevOrgRunning = useRef(false);
  useEffect(() => {
    if (prevOrgRunning.current && orgImport && !orgImport.running) {
      qc.invalidateQueries({ queryKey: ["config"] });
    }
    prevOrgRunning.current = orgImport?.running ?? false;
  }, [orgImport?.running]);

  const tabStyle = (t: Tab): React.CSSProperties => ({
    background: "none",
    border: "none",
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
    borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "color 0.15s",
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Settings</h1>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 24 }}>
        Manage your Whitespace configuration and preferences.
      </p>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 32 }}>
        <button style={tabStyle("runner")} onClick={() => goTab("runner")}>Runner</button>
        <button style={tabStyle("pipeline")} onClick={() => goTab("pipeline")}>Pipeline</button>
        <button style={tabStyle("feeds")} onClick={() => goTab("feeds")}>Feeds</button>
        <button style={tabStyle("appearance")} onClick={() => goTab("appearance")}>Appearance</button>
      </div>

      {/* Runner tab */}
      {tab === "runner" && (
        <SettingsCard title="LLM Runner" description="Select which runner to use. Only available runners can be enabled.">
          {runners && config ? runners.runners.map((r, i) => {
            const isActive = runners.active === r.name;
            const modelOptions = RUNNER_MODELS[r.name] ?? [];
            const currentModel = config.runner_model_prefs[r.name] ?? "";
            return (
              <div key={r.name} style={{
                padding: "14px 0",
                borderBottom: i < runners.runners.length - 1 ? "1px solid var(--border)" : "none",
                opacity: r.available ? 1 : 0.45,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{r.label}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {r.method === "cli" ? "subprocess · no API key needed" : r.name.toUpperCase().replace("_", "_") + "_API_KEY"}
                      {!r.available && <span style={{ marginLeft: 6, color: "var(--badge-emerging-text)" }}>
                        {r.method === "cli" ? "· not detected" : "· no key set"}
                      </span>}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {modelOptions.length > 0 && (
                      <select
                        value={currentModel}
                        onChange={e => setRunnerModel.mutate({ runner: r.name, model: e.target.value || null })}
                        disabled={setRunnerModel.isPending}
                        style={{
                          padding: "5px 10px", fontSize: 12, borderRadius: 6,
                          border: "1px solid var(--border)", background: "var(--bg)",
                          color: "var(--text-secondary)", fontFamily: "inherit", cursor: "pointer",
                        }}
                      >
                        <option value="">Default</option>
                        {modelOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => r.available && setRunner.mutate(runners.active === r.name ? null : r.name)}
                      disabled={!r.available || setRunner.isPending}
                      style={{
                        width: 44, height: 24, borderRadius: 999, border: "none", padding: 0,
                        background: isActive ? "var(--accent)" : "var(--border)",
                        position: "relative", flexShrink: 0,
                        cursor: r.available ? "pointer" : "not-allowed",
                        transition: "background 0.2s",
                      }}
                      aria-label={`${isActive ? "Disable" : "Enable"} ${r.label}`}
                    >
                      <span style={{
                        position: "absolute", top: 3, left: isActive ? 23 : 3,
                        width: 18, height: 18, borderRadius: "50%", background: "white",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                        transition: "left 0.2s",
                      }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          }) : <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>}
        </SettingsCard>
      )}

      {/* Pipeline tab */}
      {tab === "pipeline" && (
        <>
          <SubTabBar<PipelineTab>
            tabs={[
              { key: "limits", label: "Limits" },
              { key: "schedule", label: "Schedule" },
            ]}
            active={pipelineTab}
            onChange={setPipelineTab}
          />

          {pipelineTab === "limits" && (
            <SettingsCard title="Run Limits" description="Control how many ideas are generated and how many sources are used per pipeline run.">
              {config ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>
                        Ideas per Run
                      </label>
                      <input
                        type="number" min={1}
                        value={ideasPerRunInput || config.ideas_per_run}
                        onChange={e => setIdeasPerRunInput(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>
                        Max New Sources per Run
                      </label>
                      <input
                        type="number" min={1}
                        value={maxSourcesInput || config.max_sources_per_run}
                        onChange={e => setMaxSourcesInput(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>
                        Cached Analyses to Load
                      </label>
                      <input
                        type="number" min={0}
                        value={cachedCountInput || config.cached_analyses_count}
                        onChange={e => setCachedCountInput(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const ideas = Math.max(1, parseInt(ideasPerRunInput || String(config.ideas_per_run), 10));
                      const maxSrc = Math.max(1, parseInt(maxSourcesInput || String(config.max_sources_per_run), 10));
                      const cached = Math.max(0, parseInt(cachedCountInput || String(config.cached_analyses_count), 10));
                      setPipelineConfig.mutate({ ideas_per_run: ideas, max_sources_per_run: maxSrc, cached_analyses_count: cached });
                      setIdeasPerRunInput(""); setMaxSourcesInput(""); setCachedCountInput("");
                    }}
                    disabled={setPipelineConfig.isPending}
                    style={primaryButtonStyle}
                  >
                    {setPipelineConfig.isPending ? "Saving…" : "Save"}
                  </button>
                </>
              ) : <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>}
            </SettingsCard>
          )}

          {pipelineTab === "schedule" && (
            <>
              <SettingsCard title="Auto-Run Schedule" description="Run the pipeline automatically at a fixed interval in addition to manual refreshes.">
                {schedule ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                          {schedule.enabled ? "Enabled" : "Disabled"}
                        </p>
                        {schedule.enabled && schedule.next_run_at && (
                          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            Next run: {new Date(schedule.next_run_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                      <Toggle
                        on={schedule.enabled}
                        disabled={setSchedule.isPending}
                        onToggle={() => setSchedule.mutate({ enabled: !schedule.enabled, interval_minutes: schedule.interval_minutes })}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>
                          Interval (minutes)
                        </label>
                        <input
                          type="number" min={5}
                          value={intervalInput || schedule.interval_minutes}
                          onChange={e => setIntervalInput(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const mins = Math.max(5, parseInt(intervalInput || String(schedule.interval_minutes), 10));
                          setSchedule.mutate({ enabled: schedule.enabled, interval_minutes: mins });
                          setIntervalInput("");
                        }}
                        disabled={setSchedule.isPending}
                        style={primaryButtonStyle}
                      >
                        Apply
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
                      Minimum 5 minutes. The pipeline skips if already running.
                    </p>
                  </>
                ) : <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>}
              </SettingsCard>

              {config && (
                <SettingsCard title="Daily Schedule">
                  <FormField label="UTC Hour" value={String(config.schedule_hour)} />
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                    Edit in <code style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>backend/.env</code> and restart to change.
                  </p>
                </SettingsCard>
              )}
            </>
          )}
        </>
      )}

      {/* Feeds tab */}
      {tab === "feeds" && (
        <>
          <SubTabBar<FeedsTab>
            tabs={[
              { key: "sources", label: "Sources" },
              { key: "arxiv", label: "arXiv" },
              { key: "github", label: "GitHub" },
            ]}
            active={feedsTab}
            onChange={setFeedsTab}
          />

          {feedsTab === "sources" && (
            <SettingsCard title="Feed Sources" description="Toggle which data sources are active. Disabled sources are skipped during pipeline runs.">
              {config ? (
                <div>
                  {FEED_SOURCES.map((src, i) => {
                    const isEnabled = config.enabled_sources[src.key] ?? true;
                    return (
                      <div key={src.key} style={{
                        padding: "16px 0",
                        borderBottom: i < FEED_SOURCES.length - 1 ? "1px solid var(--border)" : "none",
                      }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 3px" }}>{src.label}</p>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{src.description}</p>
                          </div>
                          <Toggle
                            on={isEnabled}
                            disabled={toggleSource.isPending}
                            onToggle={() => toggleSource.mutate({ source: src.key, enabled: !isEnabled })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>}
            </SettingsCard>
          )}

          {feedsTab === "arxiv" && (
            <SettingsCard title="arXiv Configuration" description="Filter which organizations and categories to pull from arXiv.">
              {config ? (
                <>
                  <ToggleTagSection
                    label="AI Lab Organizations"
                    all={config.arxiv_orgs}
                    active={config.active_orgs}
                    onToggle={(tag) => {
                      const next = config.active_orgs.includes(tag)
                        ? config.active_orgs.filter(o => o !== tag)
                        : [...config.active_orgs, tag];
                      setDataSources.mutate({ orgs: next, categories: config.active_categories });
                    }}
                  />
                  <ToggleTagSection
                    label="Categories"
                    all={config.arxiv_categories}
                    active={config.active_categories}
                    onToggle={(tag) => {
                      const next = config.active_categories.includes(tag)
                        ? config.active_categories.filter(c => c !== tag)
                        : [...config.active_categories, tag];
                      setDataSources.mutate({ orgs: config.active_orgs, categories: next });
                    }}
                  />
                </>
              ) : <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>}
            </SettingsCard>
          )}

          {feedsTab === "github" && (
            <SettingsCard title="Reference Repositories" description="READMEs and recent activity from these repos are read during each pipeline run and inform idea generation. Add any repos relevant to your research domain.">
              {config && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <input
                      type="text"
                      placeholder="owner/repo or https://github.com/owner/repo"
                      value={githubInput}
                      onChange={e => setGithubInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const slug = parseGithubRepoSlug(githubInput);
                          if (slug && !config.github_repos.includes(slug)) {
                            setGithubRepos.mutate([...config.github_repos, slug]);
                            setGithubInput("");
                          }
                        }
                      }}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={() => {
                        const slug = parseGithubRepoSlug(githubInput);
                        if (slug && !config.github_repos.includes(slug)) {
                          setGithubRepos.mutate([...config.github_repos, slug]);
                          setGithubInput("");
                        }
                      }}
                      disabled={setGithubRepos.isPending || !githubInput.trim()}
                      style={primaryButtonStyle}
                    >Add</button>
                  </div>
                  {config.github_repos.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {config.github_repos.map(repo => (
                        <div key={repo} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: "var(--bg)", border: "1px solid var(--border)",
                          padding: "10px 14px", borderRadius: 8,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 15, color: "var(--text-muted)" }}>⌥</span>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{repo}</p>
                              <a
                                href={`https://github.com/${repo}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "none" }}
                              >
                                github.com/{repo} ↗
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => setGithubRepos.mutate(config.github_repos.filter(r => r !== repo))}
                            disabled={setGithubRepos.isPending}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, lineHeight: 1, padding: "0 4px" }}
                            aria-label={`Remove ${repo}`}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      No reference repos yet. Add repos above and they'll be read on each pipeline run.
                    </div>
                  )}
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Bulk import from a user or org</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Scans all public repos for a GitHub user or organisation and adds them to the list above.</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="username or org (e.g. ruvnet)"
                    value={orgInput}
                    onChange={e => { setOrgInput(e.target.value); setScanInitiated(false); }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && orgInput.trim() && !orgImport?.running) {
                        setScanInitiated(true);
                        importOrg.mutate(parseGithubHandle(orgInput));
                      }
                    }}
                    disabled={orgImport?.running}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => {
                      if (orgInput.trim()) {
                        setScanInitiated(true);
                        importOrg.mutate(parseGithubHandle(orgInput));
                      }
                    }}
                    disabled={!orgInput.trim() || orgImport?.running || importOrg.isPending}
                    style={primaryButtonStyle}
                  >
                    {orgImport?.running ? "Scanning…" : "Scan"}
                  </button>
                </div>
                {scanInitiated && orgImport?.message && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 8,
                    background: orgImport.running ? "var(--bg)" : (orgImport.message.startsWith("Error") ? "rgba(220,53,69,0.08)" : "rgba(40,167,69,0.08)"),
                    border: `1px solid ${orgImport.running ? "var(--border)" : (orgImport.message.startsWith("Error") ? "rgba(220,53,69,0.3)" : "rgba(40,167,69,0.3)")}`,
                  }}>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{orgImport.message}</p>
                    {orgImport.running && orgImport.total !== null && (
                      <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 2, background: "var(--accent)",
                          width: `${Math.round((orgImport.scanned / orgImport.total) * 100)}%`,
                          transition: "width 0.3s",
                        }} />
                      </div>
                    )}
                  </div>
                )}
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                  Set <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>GITHUB_TOKEN</code> in <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>backend/.env</code> to avoid rate limits.
                </p>
              </div>
            </SettingsCard>
          )}
        </>
      )}

      {/* Appearance tab */}
      {tab === "appearance" && (
        <SettingsCard title="">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Theme</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>Switch between light and dark mode.</p>
            </div>
            <button onClick={toggle} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, fontSize: 14, fontWeight: 500,
              color: "var(--text-secondary)", padding: "8px 16px", cursor: "pointer",
            }}>
              {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
            </button>
          </div>
        </SettingsCard>
      )}

      <footer style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 40, lineHeight: 1.8 }}>
        <div>Whitespace v2</div>
        <div>Backend API · <code style={{ fontSize: 11 }}>localhost:18730</code></div>
      </footer>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: 14,
  borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--bg)", color: "var(--text-primary)", fontFamily: "inherit",
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 20px", borderRadius: 8,
  background: "var(--accent)", color: "white", border: "none",
  fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
};

function SubTabBar<T extends string>({ tabs, active, onChange }: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            background: active === t.key ? "var(--accent)" : "var(--surface)",
            border: active === t.key ? "1px solid var(--accent)" : "1px solid var(--border)",
            borderRadius: 999,
            padding: "5px 16px",
            fontSize: 13,
            fontWeight: active === t.key ? 600 : 400,
            color: active === t.key ? "white" : "var(--text-muted)",
            cursor: "pointer",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 20 }}>
      {title && (
        <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{title}</p>
          {description && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function FormField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>{label}</label>
      <input readOnly value={value} style={inputStyle} />
    </div>
  );
}

function Toggle({ on, disabled, onToggle }: { on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        width: 44, height: 24, borderRadius: 999, border: "none", padding: 0,
        background: on ? "var(--accent)" : "var(--border)",
        position: "relative", flexShrink: 0, cursor: "pointer", transition: "background 0.2s",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s",
      }} />
    </button>
  );
}

function ToggleTagSection({ label, all, active, onToggle }: {
  label: string; all: string[]; active: string[]; onToggle: (tag: string) => void;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 10 }}>{label}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {all.map(t => {
          const on = active.includes(t);
          return (
            <button key={t} onClick={() => onToggle(t)} style={{
              display: "inline-flex", alignItems: "center",
              background: on ? "var(--accent)" : "var(--bg)",
              border: on ? "1px solid var(--accent)" : "1px solid var(--border)",
              padding: "5px 14px", borderRadius: 999,
              fontSize: 13, fontWeight: 500,
              color: on ? "white" : "var(--text-muted)",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
