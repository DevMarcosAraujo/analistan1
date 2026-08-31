import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Eye, EyeOff, Pencil, Search, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import type { AcessoEquipamento, Equipamento, TipoAcesso } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AcessoComEquipamento extends AcessoEquipamento {
  equipamentos: Pick<Equipamento, "id" | "nome"> | null
}

const TIPOS: TipoAcesso[] = ["painel_web", "teamviewer", "rdp", "ssh", "outro"]

// teamviewer so pede IP + senha; os demais tipos tambem pedem usuario
function mostraUsuario(tipo: TipoAcesso) {
  return tipo !== "teamviewer"
}

const emptyForm = {
  equipamento_id: "",
  tipo_acesso: "painel_web" as TipoAcesso,
  url_ou_ip: "",
  usuario: "",
  porta: "",
  senha: "",
}

export function AcessosPage() {
  const { isAdmin } = useAuth()
  const [acessos, setAcessos] = useState<AcessoComEquipamento[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AcessoComEquipamento | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<string, string>>({})
  const [busca, setBusca] = useState("")
  const [pinAlvo, setPinAlvo] = useState<string | null>(null)
  const [pinDigitado, setPinDigitado] = useState("")
  const [pinConfigOpen, setPinConfigOpen] = useState(false)
  const [novoPin, setNovoPin] = useState("")

  const acessosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return acessos
    return acessos.filter((ac) =>
      [ac.equipamentos?.nome, ac.tipo_acesso, ac.url_ou_ip, ac.usuario, ac.porta].some((campo) =>
        campo?.toLowerCase().includes(termo)
      )
    )
  }, [acessos, busca])

  async function fetchData() {
    setLoading(true)
    const [acRes, eqRes] = await Promise.all([
      supabase
        .from("acessos_equipamento")
        .select("*, equipamentos(id, nome)")
        .order("criado_em", { ascending: false }),
      supabase.from("equipamentos").select("*").order("nome"),
    ])
    if (acRes.error) {
      toast.error("Erro ao carregar dados: " + acRes.error.message)
    } else {
      setAcessos(
        (acRes.data as Array<AcessoEquipamento & { equipamentos: Pick<Equipamento, "id" | "nome"> | null; senha_criptografada: string | null }>).map(
          ({ senha_criptografada, ...ac }) => ({ ...ac, tem_senha: senha_criptografada != null })
        ) as AcessoComEquipamento[]
      )
    }
    if (eqRes.error) {
      toast.error("Erro ao carregar equipamentos: " + eqRes.error.message)
    } else {
      setEquipamentos(eqRes.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(ac: AcessoComEquipamento) {
    setEditing(ac)
    setForm({
      equipamento_id: ac.equipamento_id,
      tipo_acesso: ac.tipo_acesso,
      url_ou_ip: ac.url_ou_ip ?? "",
      usuario: ac.usuario ?? "",
      porta: ac.porta ?? "",
      senha: "",
    })
    setOpen(true)
  }

  async function handleSubmit() {
    if (!editing && !form.equipamento_id) {
      toast.error("Selecione o equipamento")
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase
          .from("acessos_equipamento")
          .update({
            tipo_acesso: form.tipo_acesso,
            url_ou_ip: form.url_ou_ip.trim() || null,
            usuario: form.usuario.trim() || null,
            porta: form.porta.trim() || null,
          })
          .eq("id", editing.id)
        if (error) throw error
        if (form.senha.trim()) {
          const { error: senhaError } = await supabase.rpc("salvar_senha_acesso", {
            p_acesso_id: editing.id,
            p_senha: form.senha.trim(),
          })
          if (senhaError) throw senhaError
        }
        toast.success("Acesso atualizado")
      } else {
        const { data, error } = await supabase
          .from("acessos_equipamento")
          .insert({
            equipamento_id: form.equipamento_id,
            tipo_acesso: form.tipo_acesso,
            url_ou_ip: form.url_ou_ip.trim() || null,
            usuario: form.usuario.trim() || null,
            porta: form.porta.trim() || null,
          })
          .select("id")
          .single()
        if (error) throw error
        if (form.senha.trim()) {
          const { error: senhaError } = await supabase.rpc("salvar_senha_acesso", {
            p_acesso_id: data.id,
            p_senha: form.senha.trim(),
          })
          if (senhaError) throw senhaError
        }
        toast.success("Acesso criado")
      }
      setForm(emptyForm)
      setEditing(null)
      setOpen(false)
      setSenhasVisiveis({})
      fetchData()
    } catch (err) {
      toast.error("Erro ao salvar: " + (err instanceof Error ? err.message : ""))
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("acessos_equipamento").delete().eq("id", id)
    if (error) {
      toast.error("Erro ao excluir: " + error.message)
    } else {
      toast.success("Acesso removido")
      fetchData()
    }
  }

  function toggleSenha(id: string) {
    if (senhasVisiveis[id]) {
      setSenhasVisiveis((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      return
    }
    setPinAlvo(id)
    setPinDigitado("")
  }

  async function confirmarPin() {
    if (!pinAlvo || !pinDigitado.trim()) return
    const { data, error } = await supabase.rpc("ver_senha_acesso", {
      p_acesso_id: pinAlvo,
      p_pin: pinDigitado.trim(),
    })
    if (error) {
      toast.error(error.message)
      return
    }
    setSenhasVisiveis((prev) => ({ ...prev, [pinAlvo]: data ?? "" }))
    setPinAlvo(null)
    setPinDigitado("")
  }

  async function salvarNovoPin() {
    if (novoPin.trim().length < 4) {
      toast.error("O PIN precisa ter pelo menos 4 digitos")
      return
    }
    const { error } = await supabase.rpc("definir_pin_senha", { p_pin: novoPin.trim() })
    if (error) {
      toast.error("Erro ao definir PIN: " + error.message)
      return
    }
    toast.success("PIN atualizado")
    setNovoPin("")
    setPinConfigOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Acessos</h2>
          <p className="text-sm text-muted-foreground">
            Paineis web, TeamViewer, RDP e SSH dos equipamentos. Senhas ficam criptografadas
            (AES-256) no banco local.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Dialog open={pinConfigOpen} onOpenChange={setPinConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <KeyRound className="size-4" />
                  Definir PIN
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Definir PIN para ver senhas</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label>Novo PIN (minimo 4 digitos)</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    value={novoPin}
                    onChange={(e) => setNovoPin(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && salvarNovoPin()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Qualquer pessoa logada que souber esse PIN vai conseguir ver as senhas de
                    acesso salvas.
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={salvarNovoPin}>Salvar PIN</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v)
              if (!v) {
                setEditing(null)
                setForm(emptyForm)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openCreate}>
                <Plus className="size-4" />
                Novo acesso
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar acesso" : "Novo acesso"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {!editing && (
                <div className="space-y-2">
                  <Label>Equipamento</Label>
                  <Select
                    value={form.equipamento_id}
                    onValueChange={(v) => setForm({ ...form, equipamento_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um equipamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipamentos.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tipo de acesso</Label>
                <Select
                  value={form.tipo_acesso}
                  onValueChange={(v) => setForm({ ...form, tipo_acesso: v as TipoAcesso })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>IP</Label>
                <Input
                  value={form.url_ou_ip}
                  onChange={(e) => setForm({ ...form, url_ou_ip: e.target.value })}
                  placeholder="192.168.0.10"
                />
              </div>

              <div
                className={
                  mostraUsuario(form.tipo_acesso) ? "grid grid-cols-2 gap-4" : "space-y-2"
                }
              >
                {mostraUsuario(form.tipo_acesso) && (
                  <div className="space-y-2">
                    <Label>Usuario</Label>
                    <Input
                      value={form.usuario}
                      onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Porta</Label>
                  <Input
                    value={form.porta}
                    onChange={(e) => setForm({ ...form, porta: e.target.value })}
                    placeholder="onde esta conectado (ex: switch porta 12)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Senha {editing && "(deixe em branco para manter a atual)"}</Label>
                <Input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por equipamento, tipo, IP, usuario..."
          className="pl-8"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipamento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Porta</TableHead>
            <TableHead>Senha</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
          )}
          {!loading && acessosFiltrados.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {acessos.length === 0 ? "Nenhum acesso cadastrado" : "Nenhum resultado encontrado"}
              </TableCell>
            </TableRow>
          )}
          {acessosFiltrados.map((ac) => (
            <TableRow key={ac.id}>
              <TableCell className="font-medium">{ac.equipamentos?.nome ?? "-"}</TableCell>
              <TableCell>{ac.tipo_acesso}</TableCell>
              <TableCell>{ac.url_ou_ip ?? "-"}</TableCell>
              <TableCell>{ac.usuario ?? "-"}</TableCell>
              <TableCell>{ac.porta ?? "-"}</TableCell>
              <TableCell className="font-mono text-sm">
                {!ac.tem_senha && <span className="text-muted-foreground">-</span>}
                {ac.tem_senha && (
                  <div className="flex items-center gap-2">
                    <span>{senhasVisiveis[ac.id] ?? "••••••••"}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleSenha(ac.id)}
                    >
                      {senhasVisiveis[ac.id] ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(ac)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(ac.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={pinAlvo !== null} onOpenChange={(v) => !v && setPinAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Digite o PIN para ver a senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              autoFocus
              type="password"
              inputMode="numeric"
              value={pinDigitado}
              onChange={(e) => setPinDigitado(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmarPin()}
              placeholder="PIN"
            />
          </div>
          <DialogFooter>
            <Button onClick={confirmarPin} disabled={!pinDigitado.trim()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
