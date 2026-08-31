import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, Building2, Cpu, KeyRound, LogOut, Map } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/setores", label: "Setores", icon: Building2, end: false },
  { to: "/equipamentos", label: "Equipamentos", icon: Cpu, end: false },
  { to: "/acessos", label: "Acessos", icon: KeyRound, end: false },
  { to: "/mapa", label: "Mapa", icon: Map, end: false },
]

export function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-64 flex-col border-r bg-card">
        <div className="border-b px-4 py-4">
          <h1 className="text-lg font-semibold">TI Hospitalar</h1>
          <p className="text-xs text-muted-foreground">Gestao de Infraestrutura</p>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <p className="truncate px-1 text-xs text-muted-foreground">{user?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
