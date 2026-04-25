import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggle: () => {
        const next = get().theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", next);
        set({ theme: next });
      },
    }),
    { name: "whitespace-theme" }
  )
);

try {
  const stored = JSON.parse(localStorage.getItem("whitespace-theme") ?? "{}") as { state?: { theme?: Theme } };
  if (stored?.state?.theme) {
    document.documentElement.setAttribute("data-theme", stored.state.theme);
  }
} catch {
  // corrupted storage — leave default theme in place
}
