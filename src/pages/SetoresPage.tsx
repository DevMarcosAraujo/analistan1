import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Search, MapPin, X } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { NIVEIS } from "@/data/plantaBaixa"
import {
  fetchSetores as fetchMapaSetores,
  fetchPontos as fetchMapaPontos,
  criarPontoPlanejado,
  apagarPonto,
  proximoCodigo,
  type PontoComSetor,
} from "@/lib/mapaData"
import type { Setor } from "@/types/database"
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

const NIVEIS_DISPONIVEIS = NIVEIS.filter((n) => n.disponivel)
const PREDIOS_DISPONIVEIS = ["SIG"]

const TIPO_LABEL: Record<string, string> = {
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

interface EquipamentoResumo {
  id: string
  nome: string
  tipo: string
  status: string
  mapa_nivel_id: string | null
  mapa_setor_nome: string | null
  mapa_ponto_codigo: string | null
}

export function SetoresPage() {
  const [setores, setSetores] = useState<Setor[]>([])
  const [equipamentos, setEquipamentos] = useState<EquipamentoResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState("")
  const [predio, setPredio] = useState("")
  const [andar, setAndar] = useState("")
  const [busca, setBusca] = useState("")
  const [setorDetalhe, setSetorDetalhe] = useState<Setor | null>(null)
  const [mapaSetorLigado, setMapaSetorLigado] = useState<{ id: string; sigla: string } | null>(null)
  const [pontosDetalhe, setPontosDetalhe] = useState<PontoComSetor[]>([])
  const [carregandoPontos, setCarregandoPontos] = useState(false)
  const [novoPontoNome, setNovoPontoNome] = useState("")
  const [salvandoPonto, setSalvandoPonto] = useState(false)

  const setoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return setores
    return setores.filter((s) =>
      [s.nome, s.predio, s.andar].some((campo) => campo?.toLowerCase().includes(termo))
    )
  }, [setores, busca])

  function nomeDoAndar(id: string | null) {
    if (!id) return "-"
    return NIVEIS.find((n) => n.id === id)?.nome ?? id
  }

  function equipamentosDoSetor(setor: Setor) {
    if (!setor.andar) return []
    return equipamentos.filter(
      (eq) =>
        eq.mapa_nivel_id === setor.andar &&
        eq.mapa_setor_nome?.toLowerCase() === setor.nome.toLowerCase()
    )
  }

  async function fetchSetores() {
    setLoading(true)
    const [{ data, error }, { data: eqData, error: eqError }] = await Promise.all([
      supabase.from("setores").select("*").order("nome"),
      supabase
        .from("equipamentos")
        .select("id, nome, tipo, status, mapa_nivel_id, mapa_setor_nome, mapa_ponto_codigo"),
    ])
    if (error) {
      toast.error("Erro ao carregar setores: " + error.message)
    } else {
      setSetores(data)
    }
    if (eqError) {
      toast.error("Erro ao carregar equipamentos: " + eqError.message)
    } else {
      setEquipamentos(eqData ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSetores()
  }, [])

  async function handleSubmit() {
    if (!nome.trim()) {
      toast.error("Informe o nome do setor")
      return
    }
    setSaving(true)
    const { error } = await supabase.from("setores").insert({
      nome: nome.trim(),
      predio: predio.trim() || null,
      andar: andar || null,
    })
    if (error) {
      toast.error("Erro ao salvar: " + error.message)
    } else {
      toast.success("Setor criado")
      setNome("")
      setPredio("")
      setAndar("")
      setOpen(false)
      fetchSetores()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("setores").delete().eq("id", id)
    if (error) {
      toast.error("Erro ao excluir: " + error.message)
    } else {
      toast.success("Setor removido")
      fetchSetores()
    }
  }

  async function carregarPontosDoDetalhe(setor: Setor) {
    if (!setor.andar) {
      setMapaSetorLigado(null)
      setPontosDetalhe([])
      return
    }
    setCarregandoPontos(true)
    try {
      const mapaSetores = await fetchMapaSetores(setor.andar)
      const encontrado = mapaSetores.find((s) => s.nome.toLowerCase() === setor.nome.toLowerCase())
      if (!encontrado) {
        setMapaSetorLigado(null)
        setPontosDetalhe([])
        return
      }
      setMapaSetorLigado({ id: encontrado.id, sigla: encontrado.sigla })
      const pontos = await fetchMapaPontos(setor.andar)
      setPontosDetalhe(pontos.filter((p) => p.setorId === encontrado.id))
    } finally {
      setCarregandoPontos(false)
    }
  }

  useEffect(() => {
    setNovoPontoNome("")
    if (setorDetalhe) carregarPontosDoDetalhe(setorDetalhe)
    else {
      setMapaSetorLigado(null)
      setPontosDetalhe([])
    }
  }, [setorDetalhe])

  async function handleCriarPontoPlanejado() {
    if (!setorDetalhe?.andar || !mapaSetorLigado || !novoPontoNome.trim()) return
    setSalvandoPonto(true)
    try {
      const codigo = proximoCodigo(mapaSetorLigado.sigla, setorDetalhe.andar, pontosDetalhe)
      await criarPontoPlanejado(setorDetalhe.andar, mapaSetorLigado.id, {
        codigo,
        nome: novoPontoNome.trim(),
      })
      setNovoPontoNome("")
      await carregarPontosDoDetalhe(setorDetalhe)
    } catch (err) {
      toast.error("Erro ao cadastrar ponto: " + (err instanceof Error ? err.message : ""))
    } finally {
      setSalvandoPonto(false)
    }
  }

  async function handleRemoverPontoPlanejado(pontoId: string) {
    if (!setorDetalhe) return
    await apagarPonto(pontoId)
    await carregarPontosDoDetalhe(setorDetalhe)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Setores</h2>
          <p className="text-sm text-muted-foreground">
            Locais do hospital (UTI, Pronto Socorro, Farmacia...)
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Novo setor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo setor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Predio</Label>
                <Select value={predio} onValueChange={setPredio}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha o predio" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDIOS_DISPONIVEIS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Andar</Label>
                <Select value={andar} onValueChange={setAndar}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha o andar (planta do Mapa)" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEIS_DISPONIVEIS.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sao os mesmos andares que ja tem planta cadastrada em Mapa.
                </p>
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

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome, predio ou andar..."
          className="pl-8"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Predio</TableHead>
            <TableHead>Andar</TableHead>
            <TableHead>Equipamentos no mapa</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
          )}
          {!loading && setoresFiltrados.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {setores.length === 0 ? "Nenhum setor cadastrado" : "Nenhum resultado encontrado"}
              </TableCell>
            </TableRow>
          )}
          {setoresFiltrados.map((setor) => (
            <TableRow
              key={setor.id}
              className="cursor-pointer"
              onClick={() => setSetorDetalhe(setor)}
            >
              <TableCell className="font-medium">{setor.nome}</TableCell>
              <TableCell>{setor.predio ?? "-"}</TableCell>
              <TableCell>{nomeDoAndar(setor.andar)}</TableCell>
              <TableCell>{equipamentosDoSetor(setor).length}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(setor.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!setorDetalhe} onOpenChange={(v) => !v && setSetorDetalhe(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{setorDetalhe?.nome}</DialogTitle>
          </DialogHeader>
          {setorDetalhe && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {setorDetalhe.predio ? `${setorDetalhe.predio} - ` : ""}
                {nomeDoAndar(setorDetalhe.andar)}
              </p>

              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pontos
                </h3>
                {!setorDetalhe.andar ? (
                  <p className="text-xs text-muted-foreground">
                    Defina o andar desse setor pra poder cadastrar os pontos.
                  </p>
                ) : carregandoPontos ? (
                  <p className="text-xs text-muted-foreground">Carregando...</p>
                ) : !mapaSetorLigado ? (
                  <p className="text-xs text-muted-foreground">
                    Esse setor ainda nao foi desenhado no Mapa. Va em Mapa {"->"} {nomeDoAndar(setorDetalhe.andar)},
                    desenhe a area com o nome exatamente "{setorDetalhe.nome}" e volte aqui pra
                    cadastrar os pontos dele.
                  </p>
                ) : (
                  <>
                    <div className="mb-2 flex items-center gap-1">
                      <Input
                        value={novoPontoNome}
                        onChange={(e) => setNovoPontoNome(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCriarPontoPlanejado()}
                        placeholder="Ex: PC Recepcao, Impressora..."
                        className="h-8 text-xs"
                      />
                      <Button
                        size="icon-sm"
                        onClick={handleCriarPontoPlanejado}
                        disabled={!novoPontoNome.trim() || salvandoPonto}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    {pontosDetalhe.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum ponto cadastrado ainda.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {pontosDetalhe.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                          >
                            <MapPin
                              className={cn(
                                "size-3.5 flex-shrink-0",
                                p.x !== null ? "text-primary" : "text-muted-foreground"
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {p.nome}
                              <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                                {p.codigo}
                              </span>
                            </span>
                            <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                              {p.x !== null ? "posicionado" : "a posicionar"}
                            </span>
                            {p.x === null && (
                              <button
                                onClick={() => handleRemoverPontoPlanejado(p.id)}
                                className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                                title="Remover"
                              >
                                <X className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Equipamentos
              </h3>
              {equipamentosDoSetor(setorDetalhe).length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nenhum equipamento neste setor ainda. Cadastre em Equipamentos e escolha esse
                  local no mapa, com o mesmo nome e andar.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {equipamentosDoSetor(setorDetalhe).map((eq) => (
                    <div
                      key={eq.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{eq.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {TIPO_LABEL[eq.tipo] ?? eq.tipo}
                          {eq.mapa_ponto_codigo ? ` - ${eq.mapa_ponto_codigo}` : ""}
                        </p>
                      </div>
                      <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {eq.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
