import { useEffect, useState } from "react"
import { Building2, Cpu, KeyRound, Wifi } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Counts {
  setores: number
  equipamentos: number
  online: number
  acessos: number
}

export function DashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    async function load() {
      const [setores, equipamentos, online, acessos] = await Promise.all([
        supabase.from("setores").select("*", { count: "exact", head: true }),
        supabase.from("equipamentos").select("*", { count: "exact", head: true }),
        supabase.from("equipamentos").select("*", { count: "exact", head: true }).eq("status", "online"),
        supabase.from("acessos_equipamento").select("*", { count: "exact", head: true }),
      ])
      setCounts({
        setores: setores.count ?? 0,
        equipamentos: equipamentos.count ?? 0,
        online: online.count ?? 0,
        acessos: acessos.count ?? 0,
      })
    }
    load().catch(() => setCounts(null))
  }, [])

  const cards = [
    { label: "Setores", value: counts?.setores, icon: Building2 },
    { label: "Equipamentos", value: counts?.equipamentos, icon: Cpu },
    { label: "Online agora", value: counts?.online, icon: Wifi },
    { label: "Acessos cadastrados", value: counts?.acessos, icon: KeyRound },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Visao geral da infraestrutura de TI</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value ?? "-"}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
