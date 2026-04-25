import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useThemeStore } from "../store/themeStore";
import { useTriggerPipeline, usePipelineStatus } from "../hooks/useIdeas";

export function NavBar() {
  const { theme, toggle } = useThemeStore();
  const location = useLocation();
  const qc = useQueryClient();
  const triggerPipeline = useTriggerPipeline();
  const { data: pipelineStatus } = usePipelineStatus();

  const isRunning = pipelineStatus?.running ?? false;
  const prevRunIdRef = useRef<string | null | undefined>(undefined);

  // When pipeline transitions running→done and run ID changes, refresh data
  useEffect(() => {
    if (prevRunIdRef.current === undefined) {
      prevRunIdRef.current = pipelineStatus?.last_completed_run_id ?? null;
      return;
    }
    const completedId = pipelineStatus?.last_completed_run_id ?? null;
    if (!isRunning && completedId !== prevRunIdRef.current && completedId !== null) {
      prevRunIdRef.current = completedId;
      qc.invalidateQueries({ queryKey: ["today"] });
      qc.invalidateQueries({ queryKey: ["history"] });
    }
  }, [isRunning, pipelineStatus?.last_completed_run_id, qc]);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const navLinks: [string, string][] = [
    ["Ideas", "/"],
    ["History", "/history"],
    ["Saved", "/saved"],
    ["Settings", "/settings"],
  ];

  const handleRefresh = () => {
    if (isRunning || triggerPipeline.isPending) return;
    triggerPipeline.mutate(undefined);
  };

  return (
    <nav style={{
      background: "hsla(0,0%,100%,0.85)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid var(--border)",
      height: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <Link to="/" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -0.5, textDecoration: "none" }}>
        Whitespace
      </Link>

      <div style={{ display: "flex", gap: 4, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
        {navLinks.map(([label, path]) => (
          <Link key={path} to={path} style={{
            fontSize: 14,
            fontWeight: 500,
            color: isActive(path) ? "var(--text-primary)" : "var(--text-secondary)",
            padding: "8px 12px",
            borderRadius: 6,
            background: isActive(path) ? "var(--bg)" : "transparent",
            textDecoration: "none",
          }}>
            {label}
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isRunning && (
          <span style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            Generating ideas…
          </span>
        )}

        <button onClick={toggle} style={{
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 10px",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
        }} title="Toggle dark mode">
          {theme === "light" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        <button onClick={handleRefresh} disabled={isRunning || triggerPipeline.isPending} style={{
          background: "var(--accent)",
          border: "none",
          borderRadius: 8,
          color: "white",
          fontSize: 14,
          fontWeight: 500,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: (isRunning || triggerPipeline.isPending) ? 0.7 : 1,
          cursor: (isRunning || triggerPipeline.isPending) ? "not-allowed" : "pointer",
        }}>
          {(isRunning || triggerPipeline.isPending) ? (
            <>
              <span style={{
                width: 14, height: 14,
                border: "2px solid white",
                borderRightColor: "transparent",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
              }} />
              Running…
            </>
          ) : "↻ Refresh Ideas"}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        [data-theme="dark"] nav { background: hsla(0,0%,6%,0.85) !important; }
      `}</style>
    </nav>
  );
}
