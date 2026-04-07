import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
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
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("auth_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signOut = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
    window.location.href = "/login";
  };

  const setUserFromToken = (token: string, u: AuthUser) => {
    localStorage.setItem("auth_token", token);
    setUser(u);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, setUserFromToken }}>
      {children}
    </AuthContext.Provider>
  );
}
