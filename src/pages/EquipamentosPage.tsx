import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus, Trash2, Search, MapPin, Pencil } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import type { EquipamentoComSetor, ModoIp, StatusEquipamento, TipoEquipamento } from "@/types/database"
import {
  NIVEIS_DISPONIVEIS,
  setoresDoNivel,
  pontosDoSetor,
  vincularEquipamentoAoPonto,
  desvincularPonto,
} from "@/lib/mapaLocal"
import type { Setor, Ponto } from "@/data/plantaBaixa"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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

const TIPOS: TipoEquipamento[] = [
  "desktop",
  "notebook",
  "impressora_a4",
  "impressora_etiqueta",
  "impressora_pulseira",
  "impressora_termica",
  "impressora_nina",
  "tablet",
  "camera",
  "telefone",
  "switch",
  "servidor",
  "access_point",
  "outro",
]

const TIPO_LABEL: Record<TipoEquipamento, string> = {
  desktop: "Computador (Desktop)",
  notebook: "Notebook",
  impressora_a4: "Impressora A4",
  impressora_etiqueta: "Impressora de Etiqueta",
  impressora_pulseira: "Impressora de Pulseira",
  impressora_termica: "Impressora Termica",
  impressora_nina: "Impressora Nina",
  tablet: "Tablet",
  camera: "Camera",
  telefone: "Telefone",
  switch: "Switch",
  servidor: "Servidor",
  access_point: "Access Point",
  outro: "Outro",
}

const TIPOS_COMPUTADOR: TipoEquipamento[] = ["desktop", "notebook"]
const TIPOS_IMPRESSORA_COMPARTILHAVEL: TipoEquipamento[] = ["impressora_etiqueta", "impressora_pulseira"]
const TIPOS_IMPRESSORA_SO_LOCAL: TipoEquipamento[] = ["impressora_termica", "impressora_nina"]

const STATUS_OPCOES: StatusEquipamento[] = ["desconhecido", "online", "offline", "manutencao"]

const STATUS_LABEL: Record<StatusEquipamento, string> = {
  online: "Online",
  offline: "Offline",
  manutencao: "Em manutencao",
  desconhecido: "Desconhecido",
}

const STATUS_COLOR: Record<StatusEquipamento, string> = {
  online: "bg-green-100 text-green-800 hover:bg-green-100",
  offline: "bg-red-100 text-red-800 hover:bg-red-100",
  manutencao: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  desconhecido: "bg-gray-100 text-gray-800 hover:bg-gray-100",
}

const emptyForm = {
  tipo: "desktop" as TipoEquipamento,
  nome: "",
  patrimonio: "",
  ip: "",
  ip_modo: "dhcp" as ModoIp,
  host: "",
  acesso: "",
  conectados_ids: [] as string[],
  sala: "",
  responsavel: "",
  status: "desconhecido" as StatusEquipamento,
  nivel_id: "",
  setor_id: "",
  ponto_id: "",
  tv_id: "",
  tv_senha: "",
}

export function EquipamentosPage() {
  const [equipamentos, setEquipamentos] = useState<EquipamentoComSetor[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<EquipamentoComSetor | null>(null)
  const [searchParams] = useSearchParams()
  const [busca, setBusca] = useState(searchParams.get("busca") ?? "")

  const [setoresDisponiveis, setSetoresDisponiveis] = useState<Setor[]>([])
  const [pontosDisponiveis, setPontosDisponiveis] = useState<Ponto[]>([])

  useEffect(() => {
    if (!form.nivel_id) {
      setSetoresDisponiveis([])
      return
    }
    setoresDoNivel(form.nivel_id).then(setSetoresDisponiveis)
  }, [form.nivel_id, open])

  useEffect(() => {
    if (!form.nivel_id || !form.setor_id) {
      setPontosDisponiveis([])
      return
    }
    pontosDoSetor(form.nivel_id, form.setor_id).then(setPontosDisponiveis)
  }, [form.nivel_id, form.setor_id, open])

  const equipamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return equipamentos
    return equipamentos.filter((eq) =>
      [eq.nome, eq.tipo, eq.ip, eq.patrimonio, eq.sala, eq.responsavel, eq.mapa_setor_nome].some(
        (campo) => campo?.toLowerCase().includes(termo)
      )
    )
  }, [equipamentos, busca])

  const isComputador = TIPOS_COMPUTADOR.includes(form.tipo)
  const isImpressoraA4 = form.tipo === "impressora_a4"
  const isImpressoraCompartilhavel = TIPOS_IMPRESSORA_COMPARTILHAVEL.includes(form.tipo)
  const isImpressoraSoLocal = TIPOS_IMPRESSORA_SO_LOCAL.includes(form.tipo)
  const mostraCamposGerais = isComputador || isImpressoraA4 || (!isImpressoraCompartilhavel && !isImpressoraSoLocal)

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from("equipamentos")
      .select("*, setores(id, nome)")
      .order("nome")
    if (error) {
      toast.error("Erro ao carregar dados: " + error.message)
    } else {
      setEquipamentos(data as EquipamentoComSetor[])
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

  function openEdit(eq: EquipamentoComSetor) {
    setEditing(eq)
    setForm({
      tipo: eq.tipo,
      nome: eq.nome,
      patrimonio: eq.patrimonio ?? "",
      ip: eq.ip ?? "",
      ip_modo: eq.ip_modo ?? "dhcp",
      host: eq.host ?? "",
      acesso: eq.observacao ?? "",
      conectados_ids: eq.conectados_ids ?? [],
      sala: eq.sala ?? "",
      responsavel: eq.responsavel ?? "",
      status: eq.status,
      nivel_id: eq.mapa_nivel_id ?? "",
      setor_id: eq.mapa_setor_id ?? "",
      ponto_id: eq.mapa_ponto_id ?? "",
      tv_id: "",
      tv_senha: "",
    })
    setOpen(true)
  }

  async function handleSubmit() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do equipamento")
      return
    }
    setSaving(true)
    try {
      const setor = setoresDisponiveis.find((s) => s.id === form.setor_id)
      const ponto = pontosDisponiveis.find((p) => p.id === form.ponto_id)
      const usaIp = isImpressoraA4 || (isComputador && form.ip_modo === "fixo") || isImpressoraCompartilhavel
      const payload = {
        tipo: form.tipo,
        nome: form.nome.trim(),
        patrimonio: mostraCamposGerais ? form.patrimonio.trim() || null : null,
        ip: usaIp ? form.ip.trim() || null : null,
        ip_modo: isComputador ? form.ip_modo : null,
        host: isComputador || isImpressoraCompartilhavel ? form.host.trim() || null : null,
        conectados_ids: isComputador ? form.conectados_ids : [],
        observacao: isImpressoraA4 ? form.acesso.trim() || null : null,
        sala: mostraCamposGerais ? form.sala.trim() || null : null,
        responsavel: mostraCamposGerais ? form.responsavel.trim() || null : null,
        status: mostraCamposGerais ? form.status : "desconhecido",
        mapa_nivel_id: form.nivel_id || null,
        mapa_setor_id: form.setor_id || null,
        mapa_setor_nome: setor?.nome ?? null,
        mapa_ponto_id: form.ponto_id || null,
        mapa_ponto_codigo: ponto?.codigo ?? null,
      }

      let equipamento: EquipamentoComSetor
      if (editing) {
        const { data, error } = await supabase
          .from("equipamentos")
          .update(payload)
          .eq("id", editing.id)
          .select("*, setores(id, nome)")
          .single()
        if (error) throw error
        equipamento = data as EquipamentoComSetor

        const localAntigo =
          editing.mapa_nivel_id && editing.mapa_ponto_id
            ? { nivel: editing.mapa_nivel_id, ponto: editing.mapa_ponto_id }
            : null
        const localNovo = form.nivel_id && form.ponto_id ? { nivel: form.nivel_id, ponto: form.ponto_id } : null
        if (localAntigo && (!localNovo || localAntigo.nivel !== localNovo.nivel || localAntigo.ponto !== localNovo.ponto)) {
          await desvincularPonto(localAntigo.nivel, localAntigo.ponto)
        }
        if (localNovo) {
          await vincularEquipamentoAoPonto(localNovo.nivel, localNovo.ponto, form.nome.trim(), equipamento.id)
        }
        toast.success("Equipamento atualizado")
      } else {
        const { data, error } = await supabase
          .from("equipamentos")
          .insert(payload)
          .select("*, setores(id, nome)")
          .single()
        if (error) throw error
        equipamento = data as EquipamentoComSetor

        if (form.tv_id.trim() || form.tv_senha.trim()) {
          const { data: acesso, error: acessoError } = await supabase
            .from("acessos_equipamento")
            .insert({
              equipamento_id: equipamento.id,
              tipo_acesso: "teamviewer",
              url_ou_ip: form.tv_id.trim() || null,
            })
            .select("id")
            .single()
          if (!acessoError && acesso && form.tv_senha.trim()) {
            await supabase.rpc("salvar_senha_acesso", {
              p_acesso_id: acesso.id,
              p_senha: form.tv_senha.trim(),
            })
          }
        }

        if (form.nivel_id && form.ponto_id) {
          await vincularEquipamentoAoPonto(form.nivel_id, form.ponto_id, form.nome.trim(), equipamento.id)
        }
        toast.success("Equipamento criado")
      }

      setForm(emptyForm)
      setEditing(null)
      setOpen(false)
      fetchData()
    } catch (err) {
      toast.error("Erro ao salvar: " + (err instanceof Error ? err.message : ""))
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const eq = equipamentos.find((e) => e.id === id)
    const { error } = await supabase.from("equipamentos").delete().eq("id", id)
    if (error) {
      toast.error("Erro ao excluir: " + error.message)
      return
    }
    if (eq?.mapa_nivel_id && eq?.mapa_ponto_id) {
      await desvincularPonto(eq.mapa_nivel_id, eq.mapa_ponto_id)
    }
    toast.success("Equipamento removido")
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Equipamentos</h2>
          <p className="text-sm text-muted-foreground">
            Computadores, impressoras, tablets e demais ativos de TI
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v)
            if (!v) {
              setForm(emptyForm)
              setEditing(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="size-4" />
              Novo equipamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="ex: IMP-UTI-03"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v as TipoEquipamento })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.tipo === "impressora_nina" && (
                <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Normalmente so existe uma impressora Nina no hospital — so marque o local dela.
                </p>
              )}

              <div className="space-y-2 rounded-lg border p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <MapPin className="size-3.5" />
                  Local no mapa
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Andar</Label>
                    <Select
                      value={form.nivel_id}
                      onValueChange={(v) => setForm({ ...form, nivel_id: v, setor_id: "", ponto_id: "" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Andar" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIVEIS_DISPONIVEIS.map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Setor</Label>
                    <Select
                      value={form.setor_id}
                      onValueChange={(v) => setForm({ ...form, setor_id: v, ponto_id: "" })}
                      disabled={!form.nivel_id}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Setor" />
                      </SelectTrigger>
                      <SelectContent>
                        {setoresDisponiveis.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ponto</Label>
                    <Select
                      value={form.ponto_id}
                      onValueChange={(v) => setForm({ ...form, ponto_id: v })}
                      disabled={!form.setor_id}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Ponto" className="truncate" />
                      </SelectTrigger>
                      <SelectContent>
                        {pontosDisponiveis.length === 0 && (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            Nenhum ponto marcado neste setor
                          </div>
                        )}
                        {pontosDisponiveis.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.codigo} - {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Os pontos vem do Mapa. Marque o local la antes de escolher aqui.
                </p>
              </div>

              {isComputador && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Rede
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Host</Label>
                      <Input
                        value={form.host}
                        onChange={(e) => setForm({ ...form, host: e.target.value })}
                        placeholder="ex: PC-UTI-03"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">IP</Label>
                      <Select
                        value={form.ip_modo}
                        onValueChange={(v) => setForm({ ...form, ip_modo: v as ModoIp })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dhcp">DHCP</SelectItem>
                          <SelectItem value="fixo">IP fixo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {form.ip_modo === "fixo" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Endereco IP</Label>
                      <Input
                        value={form.ip}
                        onChange={(e) => setForm({ ...form, ip: e.target.value })}
                        placeholder="192.168.0.10"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Maquinas conectadas (ex: impressoras)</Label>
                    <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-md border p-2">
                      {equipamentos.filter((e) => e.id !== editing?.id).length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Nenhum outro equipamento cadastrado ainda.
                        </p>
                      )}
                      {equipamentos
                        .filter((e) => e.id !== editing?.id)
                        .map((e) => (
                          <label key={e.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={form.conectados_ids.includes(e.id)}
                              onChange={(ev) =>
                                setForm({
                                  ...form,
                                  conectados_ids: ev.target.checked
                                    ? [...form.conectados_ids, e.id]
                                    : form.conectados_ids.filter((id) => id !== e.id),
                                })
                              }
                            />
                            {e.nome} <span className="text-muted-foreground">({TIPO_LABEL[e.tipo]})</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {isImpressoraA4 && (
                <div className="space-y-2">
                  <Label>IP</Label>
                  <Input
                    value={form.ip}
                    onChange={(e) => setForm({ ...form, ip: e.target.value })}
                    placeholder="192.168.0.10"
                  />
                </div>
              )}

              {isImpressoraCompartilhavel && (
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-3">
                  <div className="space-y-1 col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Compartilhada por um PC (opcional)
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Host do PC</Label>
                    <Input
                      value={form.host}
                      onChange={(e) => setForm({ ...form, host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IP do PC</Label>
                    <Input
                      value={form.ip}
                      onChange={(e) => setForm({ ...form, ip: e.target.value })}
                      placeholder="192.168.0.10"
                    />
                  </div>
                </div>
              )}

              {mostraCamposGerais && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Patrimonio</Label>
                      <Input
                        value={form.patrimonio}
                        onChange={(e) => setForm({ ...form, patrimonio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Responsavel</Label>
                      <Input
                        value={form.responsavel}
                        onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Sala</Label>
                    <Input
                      value={form.sala}
                      onChange={(e) => setForm({ ...form, sala: e.target.value })}
                    />
                  </div>

                  {isImpressoraA4 && (
                    <div className="space-y-2">
                      <Label>Acesso (usuario/senha ou URL do painel)</Label>
                      <Input
                        value={form.acesso}
                        onChange={(e) => setForm({ ...form, acesso: e.target.value })}
                        placeholder="ex: admin/admin em http://192.168.0.10"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as StatusEquipamento })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPCOES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {!editing && isComputador && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Acesso TeamViewer (opcional)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">ID do TeamViewer</Label>
                    <Input
                      value={form.tv_id}
                      onChange={(e) => setForm({ ...form, tv_id: e.target.value })}
                      placeholder="123 456 789"
                      autoComplete="off"
                      name="tv-id-no-autofill"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Senha</Label>
                    <Input
                      type="password"
                      value={form.tv_senha}
                      onChange={(e) => setForm({ ...form, tv_senha: e.target.value })}
                      autoComplete="new-password"
                      name="tv-senha-no-autofill"
                    />
                  </div>
                </div>
              </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome, tipo, IP, setor..."
          className="pl-8"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
          )}
          {!loading && equipamentosFiltrados.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {equipamentos.length === 0
                  ? "Nenhum equipamento cadastrado"
                  : "Nenhum resultado encontrado"}
              </TableCell>
            </TableRow>
          )}
          {equipamentosFiltrados.map((eq) => (
            <TableRow key={eq.id}>
              <TableCell className="font-medium">{eq.nome}</TableCell>
              <TableCell>{TIPO_LABEL[eq.tipo] ?? eq.tipo}</TableCell>
              <TableCell>
                {eq.mapa_setor_nome ? (
                  <span className="flex flex-col leading-tight">
                    <span>{eq.mapa_setor_nome}</span>
                    {eq.mapa_ponto_codigo && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {eq.mapa_ponto_codigo}
                      </span>
                    )}
                  </span>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{eq.ip ?? "-"}</TableCell>
              <TableCell>
                <Badge className={STATUS_COLOR[eq.status]} variant="secondary">
                  {eq.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(eq)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(eq.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
