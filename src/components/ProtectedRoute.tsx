import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

export function ProtectedRoute() {
  const { user, loading, mustChangePassword } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (mustChangePassword && location.pathname !== "/trocar-senha") {
    return <Navigate to="/trocar-senha" replace />
  }

  return <Outlet />
}
