import { Link, useLocation, useNavigate } from "react-router-dom";
import { useThemeStore } from "../store/themeStore";
import { api } from "../api/client";

export function NavBar() {
  const { theme, toggle } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSurprise = async () => {
    try {
      const idea = await api.getSurprise();
      navigate(`/ideas/${idea.id}`);
    } catch {
      // ignore network errors
    }
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navLinks: [string, string][] = [
    ["Ideas", "/"],
    ["Saved", "/saved"],
    ["Settings", "/settings"],
  ];

  return (
    <nav style={{
      background: "var(--surface)", borderBottom: "1px solid var(--border)",
      padding: "0 20px", display: "flex", alignItems: "center", height: 44,
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <Link to="/" style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>
        Whitespace
      </Link>
      <div style={{ marginLeft: 28, display: "flex" }}>
        {navLinks.map(([label, path]) => (
          <Link key={path} to={path} style={{
            padding: "0 12px", height: 44, display: "flex", alignItems: "center",
            fontSize: 10, fontWeight: isActive(path) ? 700 : 400,
            color: isActive(path) ? "var(--text-primary)" : "var(--text-muted)",
            borderBottom: isActive(path) ? "2px solid var(--text-primary)" : "2px solid transparent",
          }}>
            {label}
          </Link>
        ))}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button onClick={toggle} style={{
          background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)",
          fontSize: 9, padding: "5px 12px", borderRadius: 4, fontWeight: 500,
        }}>
          {theme === "light" ? "☾ Dark" : "☀ Light"}
        </button>
        <button onClick={handleSurprise} style={{
          background: "var(--text-primary)", border: "none", color: "var(--bg)",
          fontSize: 9, padding: "5px 12px", borderRadius: 4, fontWeight: 600,
        }}>
          ↻ Surprise me
        </button>
      </div>
    </nav>
  );
}
