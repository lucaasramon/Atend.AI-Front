import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

// Só grava quando a pessoa escolhe no botão (o padrão é o tema claro).
// Chave nova: a antiga ("theme") era gravada sozinha e deixava muita gente no escuro sem ter escolhido.
const CHOICE_KEY = "theme_choice";

const readChoice = (): Theme => {
  try {
    return localStorage.getItem(CHOICE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (typeof window !== "undefined" ? readChoice() : "light"));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(CHOICE_KEY, next);
      } catch {
        /* sem armazenamento: vale só nesta visita */
      }
      return next;
    });

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
