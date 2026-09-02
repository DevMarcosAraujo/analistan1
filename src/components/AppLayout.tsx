import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, Building2, Cpu, KeyRound, LogOut, Map, Users, Menu, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end: boolean
  adminOnly: boolean
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, adminOnly: false },
      { to: "/setores", label: "Setores", icon: Building2, end: false, adminOnly: false },
      { to: "/equipamentos", label: "Equipamentos", icon: Cpu, end: false, adminOnly: false },
      { to: "/acessos", label: "Acessos", icon: KeyRound, end: false, adminOnly: false },
    ],
  },
  {
    label: "SIG",
    items: [{ to: "/mapa", label: "Mapa", icon: Map, end: false, adminOnly: false }],
  },
  {
    label: null,
    items: [{ to: "/usuarios", label: "Usuarios", icon: Users, end: false, adminOnly: true }],
  },
]

export function AppLayout() {
  const { user, isAdmin, signOut } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  const gruposVisiveis = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.adminOnly || isAdmin) }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex h-screen flex-col bg-background md:flex-row">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <div>
          <h1 className="text-base font-semibold">TI Hospitalar</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMenuAberto((v) => !v)}>
          {menuAberto ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      {menuAberto && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMenuAberto(false)} />
      )}

      <aside
        className={cn(
          "z-50 flex w-64 shrink-0 flex-col border-r bg-card transition-transform md:static md:translate-x-0",
          "fixed inset-y-0 left-0 md:flex",
          menuAberto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="hidden border-b px-4 py-4 md:block">
          <h1 className="text-lg font-semibold">TI Hospitalar</h1>
          <p className="text-xs text-muted-foreground">Gestao de Infraestrutura</p>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-2">
          {gruposVisiveis.map((group, i) => (
            <div key={group.label ?? `grupo-${i}`} className="space-y-1">
              {group.label && (
                <p className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMenuAberto(false)}
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
            </div>
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

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
