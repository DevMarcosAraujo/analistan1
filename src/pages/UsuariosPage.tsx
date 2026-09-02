import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { toast } from "sonner"
import { Lock, LockOpen, ShieldCheck, ShieldOff, KeyRound } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface Perfil {
  id: string
  email: string
  is_admin: boolean
  locked: boolean
  failed_attempts: number
  must_change_password: boolean
}

export function UsuariosPage() {
  const { user, isAdmin } = useAuth()
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from("perfis")
      .select("id, email, is_admin, locked, failed_attempts, must_change_password")
      .order("email")
    if (error) toast.error("Erro ao carregar usuarios: " + error.message)
    else setPerfis(data as Perfil[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function alternarAdmin(p: Perfil) {
    const { error } = await supabase.from("perfis").update({ is_admin: !p.is_admin }).eq("id", p.id)
    if (error) toast.error("Erro: " + error.message)
    else {
      toast.success(!p.is_admin ? "Usuario promovido a admin" : "Permissao de admin removida")
      fetchData()
    }
  }

  async function desbloquear(p: Perfil) {
    const { error } = await supabase.rpc("admin_desbloquear_usuario", { p_user_id: p.id })
    if (error) toast.error("Erro: " + error.message)
    else {
      toast.success("Usuario desbloqueado. Ele vai precisar trocar a senha no proximo login.")
      fetchData()
    }
  }

  async function forcarTrocaSenha(p: Perfil) {
    const { error } = await supabase.rpc("admin_forcar_troca_senha", { p_user_id: p.id })
    if (error) toast.error("Erro: " + error.message)
    else {
      toast.success("Na proxima entrada, esse usuario vai precisar trocar a senha.")
      fetchData()
    }
  }

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie permissoes, desbloqueios e troca de senha dos usuarios do sistema.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perfis.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <CardTitle className="truncate text-sm">{p.email}</CardTitle>
                <CardDescription className="flex flex-wrap gap-1.5 pt-1">
                  {p.is_admin && <Badge>Admin</Badge>}
                  {p.locked && <Badge variant="destructive">Bloqueado</Badge>}
                  {p.must_change_password && <Badge variant="outline">Vai trocar senha</Badge>}
                  {!p.locked && p.failed_attempts > 0 && (
                    <Badge variant="outline">{p.failed_attempts}/5 tentativas</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={p.id === user?.id}
                  onClick={() => alternarAdmin(p)}
                  className="gap-1.5"
                >
                  {p.is_admin ? <ShieldOff className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                  {p.is_admin ? "Remover admin" : "Tornar admin"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!p.locked}
                  onClick={() => desbloquear(p)}
                  className="gap-1.5"
                >
                  {p.locked ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
                  Desbloquear
                </Button>
                <Button size="sm" variant="outline" onClick={() => forcarTrocaSenha(p)} className="gap-1.5">
                  <KeyRound className="size-3.5" />
                  Forcar troca de senha
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
