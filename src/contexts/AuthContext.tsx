import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name?: string | null;
  church_role?: string | null;
  /** Áreas (ministérios) do usuário: só cria/edita eventos delas */
  ministry_ids?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => void;
  setUserFromToken: (token: string, user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
  setUserFromToken: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Último usuário carregado: sem internet, o app continua logado (ex.: painel do púlpito)
const CACHE_KEY = "auth_user";
const remember = (u: AuthUser | null) => {
  try {
    if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* sem espaço no aparelho: só não guarda */
  }
};
const cachedUser = (): AuthUser | null => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.get<AuthUser>("/api/auth/me")
      .then((u) => {
        setUser(u);
        remember(u);
      })
      .catch((err: { status?: number }) => {
        // Sem internet (ou servidor fora): mantém a sessão com o último usuário conhecido
        if (!err.status || err.status >= 500) {
          const cached = cachedUser();
          if (cached) return setUser(cached);
        }
        localStorage.removeItem("auth_token");
        remember(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signOut = () => {
    localStorage.removeItem("auth_token");
    remember(null);
    setUser(null);
    window.location.href = "/login";
  };

  const setUserFromToken = (token: string, u: AuthUser) => {
    localStorage.setItem("auth_token", token);
    setUser(u);
    // O login não traz áreas/função: completa com /me
    remember(u);
    api.get<AuthUser>("/api/auth/me").then((full) => {
      setUser(full);
      remember(full);
    }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, setUserFromToken }}>
      {children}
    </AuthContext.Provider>
  );
}
