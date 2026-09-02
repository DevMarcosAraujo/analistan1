import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { toast } from "sonner"
import { Lock, LockOpen, ShieldCheck, ShieldOff, KeyRound, RotateCcw, Copy } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

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
  const [resetando, setResetando] = useState<string | null>(null)
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null)

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

  async function resetarSenha(p: Perfil) {
    setResetando(p.id)
    try {
      const { data, error } = await supabase.functions.invoke("admin-resetar-senha", {
        body: { user_id: p.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setSenhaGerada({ email: p.email, senha: data.senha })
      fetchData()
    } catch (err) {
      toast.error("Erro ao resetar senha: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setResetando(null)
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
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resetando === p.id}
                  onClick={() => resetarSenha(p)}
                  className="gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  {resetando === p.id ? "Resetando..." : "Resetar senha"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!senhaGerada} onOpenChange={(v) => !v && setSenhaGerada(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha temporaria gerada</DialogTitle>
            <DialogDescription>
              Repasse essa senha para <span className="font-medium">{senhaGerada?.email}</span>. Ele vai
              precisar trocar por uma nova senha no proximo login.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
            <code className="flex-1 select-all text-sm font-medium">{senhaGerada?.senha}</code>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                if (senhaGerada) {
                  navigator.clipboard.writeText(senhaGerada.senha)
                  toast.success("Senha copiada")
                }
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
