import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";
const KEY = "akb_theme";

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => undefined });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initial);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#070a10" : "#f4f6fb");
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

/** Read a CSS custom property (charts need concrete colors). */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
