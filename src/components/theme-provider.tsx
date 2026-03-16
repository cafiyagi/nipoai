"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const STORAGE_KEY = "nipoai-theme";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // On mount, read persisted preference
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light") {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      // Ensure dark (default) — remove attribute if present
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      if (next === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
