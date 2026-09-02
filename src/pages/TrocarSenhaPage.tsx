import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function TrocarSenhaPage() {
  const { concluirTrocaSenha, signOut } = useAuth()
  const [senha, setSenha] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (senha.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres")
      return
    }
    if (senha !== confirmar) {
      setError("As senhas nao coincidem")
      return
    }
    setSaving(true)
    try {
      const { error: erroSenha } = await supabase.auth.updateUser({ password: senha })
      if (erroSenha) throw erroSenha
      await concluirTrocaSenha()
      toast.success("Senha atualizada com sucesso")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar a senha")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Defina uma nova senha</CardTitle>
          <CardDescription>
            Por seguranca, e preciso trocar a senha antes de continuar (primeiro acesso ou apos redefinicao).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <Input
                id="confirmar"
                type="password"
                required
                minLength={6}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Salvando..." : "Salvar e continuar"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => signOut()}>
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
