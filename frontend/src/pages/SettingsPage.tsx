import { useState } from "react";
import { useRunners, useSystemConfig, useSetRunner, useSetDataSources, useSchedule, useSetSchedule, useSetPipelineConfig } from "../hooks/useIdeas";
import { useThemeStore } from "../store/themeStore";

export function SettingsPage() {
  const { data: runners } = useRunners();
  const { data: config } = useSystemConfig();
  const { data: schedule } = useSchedule();
  const { theme, toggle } = useThemeStore();
  const setRunner = useSetRunner();
  const setDataSources = useSetDataSources();
  const setSchedule = useSetSchedule();
  const setPipelineConfig = useSetPipelineConfig();
  const [intervalInput, setIntervalInput] = useState<string>("");
  const [maxSourcesInput, setMaxSourcesInput] = useState<string>("");
  const [cachedCountInput, setCachedCountInput] = useState<string>("");

  const handleToggle = (name: string) => {
    if (setRunner.isPending) return;
    const next = runners?.active === name ? null : name;
    setRunner.mutate(next);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 80px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Settings</h1>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 36 }}>
        Manage your Whitespace configuration and preferences.
      </p>

      {/* LLM Runners */}
      <SettingsCard title="LLM Runner" description="Select which runner to use. Only available runners can be enabled.">
        {runners ? runners.runners.map((r, i) => {
          const isActive = runners.active === r.name;
          return (
            <div key={r.name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 0",
              borderBottom: i < runners.runners.length - 1 ? "1px solid var(--border)" : "none",
              opacity: r.available ? 1 : 0.45,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{r.label}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {r.method === "cli" ? "subprocess · no API key needed" : r.name.toUpperCase().replace("_", "_") + "_API_KEY"}
                    {!r.available && <span style={{ marginLeft: 6, color: "var(--badge-emerging-text)" }}>
                      {r.method === "cli" ? "· not detected" : "· no key set"}
                    </span>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => r.available && handleToggle(r.name)}
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
          );
        }) : <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>}
      </SettingsCard>

      {/* Pipeline */}
      <SettingsCard title="Pipeline">
        {config ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 14 }}>
              <FormField label="Daily Schedule (UTC hour)" value={String(config.schedule_hour)} />
              <FormField label="Ideas per Run" value={String(config.ideas_per_run)} />
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
              Schedule and ideas count: edit in <code style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>backend/.env</code> and restart.
            </p>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>Source Limits</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                Cap how many new sources are ingested and how many cached analyses are loaded per run.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>
                    Max New Sources per Run
                  </label>
                  <input
                    type="number" min={1}
                    value={maxSourcesInput || config.max_sources_per_run}
                    onChange={e => setMaxSourcesInput(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px", fontSize: 14,
                      borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--bg)", color: "var(--text-primary)", fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
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
                    style={{
                      width: "100%", padding: "10px 12px", fontSize: 14,
                      borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--bg)", color: "var(--text-primary)", fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const maxSrc = Math.max(1, parseInt(maxSourcesInput || String(config.max_sources_per_run), 10));
                  const cached = Math.max(0, parseInt(cachedCountInput || String(config.cached_analyses_count), 10));
                  setPipelineConfig.mutate({ max_sources_per_run: maxSrc, cached_analyses_count: cached });
                  setMaxSourcesInput("");
                  setCachedCountInput("");
                }}
                disabled={setPipelineConfig.isPending}
                style={{
                  padding: "10px 20px", borderRadius: 8,
                  background: "var(--accent)", color: "white", border: "none",
                  fontSize: 14, fontWeight: 500, cursor: "pointer",
                }}
              >
                {setPipelineConfig.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        ) : <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>}
      </SettingsCard>

      {/* Data Sources */}
      <SettingsCard title="Data Sources" description="Toggle which organizations and arXiv categories to include in the next pipeline run.">
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
              label="arXiv Categories"
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

      {/* Auto-Run Schedule */}
      <SettingsCard title="Auto-Run Schedule" description="Run the pipeline automatically at a fixed interval in addition to manual refreshes.">
        {schedule ? (
          <div>
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
              <button
                onClick={() => setSchedule.mutate({ enabled: !schedule.enabled, interval_minutes: schedule.interval_minutes })}
                disabled={setSchedule.isPending}
                style={{
                  width: 44, height: 24, borderRadius: 999, border: "none", padding: 0,
                  background: schedule.enabled ? "var(--accent)" : "var(--border)",
                  position: "relative", flexShrink: 0, cursor: "pointer", transition: "background 0.2s",
                }}
              >
                <span style={{
                  position: "absolute", top: 3, left: schedule.enabled ? 23 : 3,
                  width: 18, height: 18, borderRadius: "50%", background: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s",
                }} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>
                  Interval (minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  value={intervalInput || schedule.interval_minutes}
                  onChange={e => setIntervalInput(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", fontSize: 14,
                    borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--bg)", color: "var(--text-primary)", fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const mins = Math.max(5, parseInt(intervalInput || String(schedule.interval_minutes), 10));
                  setSchedule.mutate({ enabled: schedule.enabled, interval_minutes: mins });
                  setIntervalInput("");
                }}
                disabled={setSchedule.isPending}
                style={{
                  marginTop: 28, padding: "10px 20px", borderRadius: 8,
                  background: "var(--accent)", color: "white", border: "none",
                  fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                Apply
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
              Minimum 5 minutes. The pipeline skips if already running.
            </p>
          </div>
        ) : <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</p>}
      </SettingsCard>

      {/* Appearance */}
      <SettingsCard title="">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Appearance</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>Switch between light and dark mode.</p>
          </div>
          <button onClick={toggle} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, fontSize: 14, fontWeight: 500,
            color: "var(--text-secondary)", padding: "8px 16px",
          }}>
            {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>
      </SettingsCard>

      <footer style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 40, lineHeight: 1.8 }}>
        <div>Whitespace v2</div>
        <div>Backend API · <code style={{ fontSize: 11 }}>localhost:18730</code></div>
      </footer>
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
      <input readOnly value={value} style={{
        width: "100%", padding: "10px 12px", fontSize: 14,
        borderRadius: 8, border: "1px solid var(--border)",
        background: "var(--bg)", color: "var(--text-primary)", fontFamily: "inherit",
        boxSizing: "border-box",
      }} />
    </div>
  );
}

function ToggleTagSection({ label, all, active, onToggle }: {
  label: string;
  all: string[];
  active: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 10 }}>{label}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {all.map(t => {
          const on = active.includes(t);
          return (
            <button
              key={t}
              onClick={() => onToggle(t)}
              style={{
                display: "inline-flex", alignItems: "center",
                background: on ? "var(--accent)" : "var(--bg)",
                border: on ? "1px solid var(--accent)" : "1px solid var(--border)",
                padding: "5px 14px", borderRadius: 999,
                fontSize: 13, fontWeight: 500,
                color: on ? "white" : "var(--text-muted)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
