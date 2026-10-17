import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminProtectedRoute({
  children,
  roles = ["admin"],
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    const home = user.role === "agenda" ? "/admin/agenda" : user.role === "viewer" ? "/admin/calendario" : "/";
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
