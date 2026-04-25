export function SettingsPage() {
  return (
    <div style={{ padding: 20, maxWidth: 480 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Settings</h2>
      <p style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.7 }}>
        Configure the LLM runner and pipeline schedule in <code>.env</code>. Restart the worker after changes.
      </p>
      <pre style={{ marginTop: 16, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: 14, fontSize: 9, color: "var(--text-secondary)", lineHeight: 1.8 }}>
{`WORKER_SCHEDULE_HOUR=2
WORKER_SCHEDULE_MINUTE=0
ARXIV_CATEGORIES=cs.LG,cs.AI,cs.SE
IDEAS_PER_RUN=8`}
      </pre>
    </div>
  );
}
