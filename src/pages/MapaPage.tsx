import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  MapPin,
  Trash2,
  X,
  Wifi,
  Pencil,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  List,
  Plus,
} from "lucide-react"
import { NIVEIS, PLAN_WIDTH, type Setor } from "@/data/plantaBaixa"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import type { EquipamentoComSetor } from "@/types/database"
import {
  apagarPonto,
  apagarSetor,
  apagarWifi,
  criarPonto,
  criarSetor,
  criarWifi,
  editarPonto,
  editarSetor,
  editarWifi,
  fetchPontos,
  fetchSetores,
  fetchWifi,
  removerEquipamentoDoPonto,
  salvarEquipamentoDoPonto,
  criarPontoPlanejado,
  posicionarPonto,
  type PontoComSetor,
  type WifiComSetor,
} from "@/lib/mapaData"

export function MapaPage() {
  const { setorId } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [nivelId, setNivelId] = useState("-2")
  const [busca, setBusca] = useState("")
  const [niveisAberto, setNiveisAberto] = useState(true)
  const [sidebarAberto, setSidebarAberto] = useState(true)
  const [setoresVersion, setSetoresVersion] = useState(0)
  const [setoresDoNivel, setSetoresDoNivel] = useState<Setor[]>([])
  const [telaCheia, setTelaCheia] = useState(false)
  const nivel = NIVEIS.find((n) => n.id === nivelId)!

  useEffect(() => {
    fetchSetores(nivel.id).then(setSetoresDoNivel)
  }, [nivel.id, setoresVersion])

  const setor = setorId ? setoresDoNivel.find((s) => s.id === setorId) : undefined

  useEffect(() => {
    if (setor && window.innerWidth < 768) setTelaCheia(true)
    if (!setor) setTelaCheia(false)
  }, [setor])

  const setoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return setoresDoNivel
    return setoresDoNivel.filter((s) => s.nome.toLowerCase().includes(termo))
  }, [setoresDoNivel, busca])

  async function apagarSetorDaLista(id: string) {
    await apagarSetor(nivel.id, id)
    if (setor?.id === id) navigate("/mapa")
    setSetoresVersion((v) => v + 1)
  }

  return (
    <div
      className={cn(
        "relative flex overflow-hidden",
        telaCheia
          ? "fixed inset-0 z-50 h-[100dvh] bg-background"
          : "h-[calc(100vh-3rem)] -m-4 sm:-m-6"
      )}
    >
      {!telaCheia && (
      <button
        onClick={() => setSidebarAberto((v) => !v)}
        title={sidebarAberto ? "Esconder menu" : "Mostrar menu"}
        className={cn(
          "absolute top-3 z-10 flex size-6 items-center justify-center rounded-md bg-card text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground",
          sidebarAberto ? "left-[13.5rem]" : "left-2"
        )}
      >
        {sidebarAberto ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </button>
      )}

      {sidebarAberto && !telaCheia && (
      <aside className="flex w-56 flex-shrink-0 flex-col gap-4 overflow-y-auto border-r bg-card p-3">
        <div>
          <button
            onClick={() => setNiveisAberto((v) => !v)}
            className="mb-1 flex w-full items-center justify-between px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            Niveis
          </button>
          {niveisAberto && (
            <div className="flex flex-col gap-1">
              {NIVEIS.map((n) => (
                <button
                  key={n.id}
                  disabled={!n.disponivel}
                  onClick={() => {
                    setNivelId(n.id)
                    navigate("/mapa")
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-mono",
                    n.id === nivelId
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent",
                    !n.disponivel && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded bg-black/10 text-xs font-semibold">
                    {n.id}
                  </span>
                  {n.nome}
                  {n.id === nivelId && (
                    <span className="ml-auto text-[10px] uppercase tracking-wide">atual</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="px-1 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Setores nesta planta
          </p>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar setor..."
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => navigate("/mapa")}
              className={cn(
                "rounded-md px-2 py-1.5 text-left text-sm",
                !setor ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-accent"
              )}
            >
              Ver planta completa
            </button>
            {setoresFiltrados.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  setor?.id === s.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <button
                  onClick={() => navigate(`/mapa/${s.id}`)}
                  className="flex flex-1 items-center gap-2 text-left truncate"
                >
                  <span className="size-1.5 flex-shrink-0 rounded-full bg-emerald-600" />
                  <span className="truncate">{s.nome}</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => apagarSetorDaLista(s.id)}
                    title="Apagar sala"
                    className="flex-shrink-0 opacity-60 hover:opacity-100 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>
      )}

      {setor ? (
        <SetorView
          nivel={nivel}
          setorId={setor.id}
          setorNome={setor.nome}
          setorSigla={setor.sigla}
          isAdmin={isAdmin}
          telaCheia={telaCheia}
          onToggleTelaCheia={() => setTelaCheia((v) => !v)}
        />
      ) : (
        <MapaView
          key={setoresVersion}
          nivel={nivel}
          onPickSetor={(id) => navigate(`/mapa/${id}`)}
          isAdmin={isAdmin}
          onSetoresChange={() => setSetoresVersion((v) => v + 1)}
        />
      )}
    </div>
  )
}

function WifiMarker({ nome, size = 34 }: { nome: string; size?: number }) {
  return (
    <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
      <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-orange-500 text-white shadow">
        <Wifi className="size-3.5" />
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 font-mono text-[10px] text-background opacity-0 group-hover:opacity-100">
        {nome}
      </div>
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  manutencao: "Em manutencao",
  desconhecido: "Desconhecido",
}

function DetalheEquipamentoCard({
  loading,
  erro,
  equipamento,
}: {
  loading: boolean
  erro: string | null
  equipamento: EquipamentoComSetor | null
}) {
  if (!loading && !erro && !equipamento) return null
  return (
    <div className="w-56 space-y-1 rounded-md border bg-muted/40 p-2 text-xs" onClick={(e) => e.stopPropagation()}>
      {loading && <p className="text-muted-foreground">Carregando...</p>}
      {erro && <p className="text-destructive">{erro}</p>}
      {equipamento && (
        <>
          <p className="text-sm font-semibold">{equipamento.nome}</p>
          <p className="text-muted-foreground">Tipo: {equipamento.tipo}</p>
          {equipamento.ip && <p className="text-muted-foreground">IP: {equipamento.ip}</p>}
          {equipamento.patrimonio && (
            <p className="text-muted-foreground">Patrimonio: {equipamento.patrimonio}</p>
          )}
          {equipamento.responsavel && (
            <p className="text-muted-foreground">Responsavel: {equipamento.responsavel}</p>
          )}
          {equipamento.sala && <p className="text-muted-foreground">Sala: {equipamento.sala}</p>}
          <p className="text-muted-foreground">Status: {STATUS_LABEL[equipamento.status] ?? equipamento.status}</p>
        </>
      )}
    </div>
  )
}

function siglaAutomatica(nome: string) {
  const letras = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z ]/g, "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
  return letras.slice(0, 4) || "SET"
}

function slugify(nome: string) {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "setor"
  )
}

function MapaView({
  nivel,
  onPickSetor,
  isAdmin,
  onSetoresChange,
}: {
  nivel: (typeof NIVEIS)[number]
  onPickSetor: (id: string) => void
  isAdmin: boolean
  onSetoresChange: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pontos, setPontos] = useState<PontoComSetor[]>([])
  const [wifi, setWifi] = useState<WifiComSetor[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [zoom, setZoom] = useState(1)
  const [modoLapis, setModoLapis] = useState(false)
  const [desenhando, setDesenhando] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [novaSalaRect, setNovaSalaRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [novaSalaNome, setNovaSalaNome] = useState("")
  const [salaEditando, setSalaEditando] = useState<string | null>(null)
  const [salaEditNome, setSalaEditNome] = useState("")
  const arrastando = useRef(false)

  async function recarregar() {
    const [p, w, s] = await Promise.all([fetchPontos(nivel.id), fetchWifi(nivel.id), fetchSetores(nivel.id)])
    setPontos(p)
    setWifi(w)
    setSetores(s)
  }

  useEffect(() => {
    recarregar()
    setZoom(1)
    setModoLapis(false)
    setDesenhando(null)
    setNovaSalaRect(null)
    setSalaEditando(null)
  }, [nivel])

  function toPct(clientX: number, clientY: number) {
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
    }
  }

  function handleWheel(e: React.WheelEvent) {
    if (!e.altKey || !e.shiftKey) return
    e.preventDefault()
    setZoom((z) => Math.min(4, Math.max(0.4, z - e.deltaY * 0.001)))
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!modoLapis || novaSalaRect) return
    const pos = toPct(e.clientX, e.clientY)
    if (!pos) return
    arrastando.current = true
    setDesenhando({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!arrastando.current || !desenhando) return
    const pos = toPct(e.clientX, e.clientY)
    if (!pos) return
    setDesenhando({ ...desenhando, x2: pos.x, y2: pos.y })
  }

  function handleMouseUp() {
    if (!arrastando.current || !desenhando) return
    arrastando.current = false
    const x1 = Math.min(desenhando.x1, desenhando.x2)
    const x2 = Math.max(desenhando.x1, desenhando.x2)
    const y1 = Math.min(desenhando.y1, desenhando.y2)
    const y2 = Math.max(desenhando.y1, desenhando.y2)
    setDesenhando(null)
    if (x2 - x1 < 1 || y2 - y1 < 1) return
    setNovaSalaRect({ x1, y1, x2, y2 })
    setNovaSalaNome("")
  }

  async function confirmarNovaSala() {
    if (!novaSalaRect || !novaSalaNome.trim()) return
    const nome = novaSalaNome.trim()
    const baseId = slugify(nome)
    let id = baseId
    let n = 2
    const idsExistentes = new Set(setores.map((s) => s.id))
    while (idsExistentes.has(id)) {
      id = `${baseId}-${n}`
      n++
    }
    await criarSetor(nivel.id, {
      id,
      nome,
      sigla: siglaAutomatica(nome),
      x1: novaSalaRect.x1,
      y1: novaSalaRect.y1,
      x2: novaSalaRect.x2,
      y2: novaSalaRect.y2,
      pontos: [],
    })
    setNovaSalaRect(null)
    setNovaSalaNome("")
    await recarregar()
    onSetoresChange()
  }

  async function apagarSala(id: string) {
    await apagarSetor(nivel.id, id)
    await recarregar()
    onSetoresChange()
  }

  async function editarSala(id: string, nome: string) {
    await editarSetor(id, { nome, sigla: siglaAutomatica(nome) })
    setSalaEditando(null)
    await recarregar()
    onSetoresChange()
  }

  const rectStyle = (r: { x1: number; y1: number; x2: number; y2: number }) => ({
    left: `${r.x1}%`,
    top: `${r.y1}%`,
    width: `${r.x2 - r.x1}%`,
    height: `${r.y2 - r.y1}%`,
  })

  return (
    <div className="relative flex-1 overflow-auto bg-muted/40" onWheel={handleWheel}>
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-card px-3 py-2">
        {isAdmin && (
          <button
            onClick={() => {
              setModoLapis((v) => !v)
              setNovaSalaRect(null)
              setSalaEditando(null)
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium",
              modoLapis
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Pencil className="size-3.5" />
            {modoLapis ? "Arraste na planta para marcar a sala" : "Marcar salas"}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
            className="flex size-7 items-center justify-center rounded-md border hover:bg-accent"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.2))}
            className="flex size-7 items-center justify-center rounded-md border hover:bg-accent"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <span className="ml-2">Alt + Shift + scroll para zoom</span>
        </div>
      </div>
      <div
        ref={containerRef}
        className={cn("relative inline-block m-10", modoLapis && "cursor-crosshair")}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <img
          src={nivel.imagem}
          alt={nivel.nome}
          style={{ width: PLAN_WIDTH * zoom, display: "block" }}
          className="rounded shadow-sm bg-white"
          draggable={false}
        />

        {setores.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              if (modoLapis) {
                setSalaEditando(s.id)
                setSalaEditNome(s.nome)
              } else {
                onPickSetor(s.id)
              }
            }}
            className={cn(
              "absolute rounded-md border-[1.5px] border-dashed border-emerald-600 bg-emerald-600/10 transition-colors",
              !modoLapis && "hover:bg-emerald-600/20 hover:border-solid"
            )}
            style={rectStyle(s)}
          >
            <span className="absolute -top-2.5 left-2 whitespace-nowrap rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {s.nome}
            </span>
            {modoLapis && (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  apagarSala(s.id)
                }}
                className="absolute -top-2.5 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-white"
              >
                <X className="size-2.5" />
              </span>
            )}
          </button>
        ))}

        {salaEditando &&
          (() => {
            const s = setores.find((x) => x.id === salaEditando)
            if (!s) return null
            return (
              <div
                className="absolute z-30 flex items-center gap-1 rounded-lg border bg-card p-2 shadow-lg"
                style={{ left: `${s.x1}%`, top: `${s.y2}%`, marginTop: 4 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Input
                  autoFocus
                  value={salaEditNome}
                  onChange={(e) => setSalaEditNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && editarSala(s.id, salaEditNome.trim())}
                  className="h-8 w-44 text-xs"
                />
                <button
                  onClick={() => editarSala(s.id, salaEditNome.trim())}
                  disabled={!salaEditNome.trim()}
                  className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setSalaEditando(null)}
                  className="flex size-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                >
                  <X className="size-4" />
                </button>
              </div>
            )
          })()}

        {desenhando && (
          <div
            className="absolute rounded-md border-2 border-primary bg-primary/10"
            style={rectStyle({
              x1: Math.min(desenhando.x1, desenhando.x2),
              y1: Math.min(desenhando.y1, desenhando.y2),
              x2: Math.max(desenhando.x1, desenhando.x2),
              y2: Math.max(desenhando.y1, desenhando.y2),
            })}
          />
        )}

        {novaSalaRect && (
          <div
            className="absolute z-30 rounded-md border-2 border-primary bg-primary/10"
            style={rectStyle(novaSalaRect)}
          >
            <div
              className="absolute left-0 top-full mt-1 flex items-center gap-1 rounded-lg border bg-card p-2 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                autoFocus
                value={novaSalaNome}
                onChange={(e) => setNovaSalaNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmarNovaSala()}
                placeholder="Nome da sala"
                className="h-8 w-44 text-xs"
              />
              <button
                onClick={confirmarNovaSala}
                disabled={!novaSalaNome.trim()}
                className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
              >
                Salvar
              </button>
              <button
                onClick={() => setNovaSalaRect(null)}
                className="flex size-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        {!modoLapis &&
          pontos.map((p) => (
            <button
              key={p.id}
              onClick={(e) => {
                e.stopPropagation()
                onPickSetor(p.setorId)
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span className="block size-2.5 rounded-full border-2 border-white bg-blue-600 shadow" />
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 flex-col items-center whitespace-nowrap rounded bg-foreground px-2 py-1 text-background opacity-0 shadow group-hover:opacity-100">
                <span className="text-[9px] font-mono opacity-80">{p.codigo}</span>
                <span className="text-[11px] font-medium">{p.nome}</span>
              </div>
            </button>
          ))}

        {!modoLapis &&
          wifi.map((w) => (
            <button
              key={w.id}
              onClick={(e) => {
                e.stopPropagation()
                onPickSetor(w.setorId)
              }}
              className="absolute group"
              style={{ left: `${w.x}%`, top: `${w.y}%` }}
            >
              <WifiMarker nome={w.nome} />
            </button>
          ))}
      </div>
    </div>
  )
}

function nivelCodigo(nivelId: string) {
  return nivelId.startsWith("-") ? `N${nivelId.slice(1)}` : `N${nivelId}`
}

function proximoCodigo(setorSigla: string, nivelId: string, existentes: PontoComSetor[]) {
  const prefixo = `${setorSigla}-${nivelCodigo(nivelId)}-P`
  const usados = existentes
    .map((p) => p.codigo)
    .filter((c) => c.startsWith(prefixo))
    .map((c) => parseInt(c.slice(prefixo.length), 10))
    .filter((n) => !Number.isNaN(n))
  const proximo = usados.length ? Math.max(...usados) + 1 : 1
  return `${prefixo}${String(proximo).padStart(2, "0")}`
}

function SetorView({
  nivel,
  setorId,
  setorNome,
  setorSigla,
  isAdmin,
  telaCheia,
  onToggleTelaCheia,
}: {
  nivel: (typeof NIVEIS)[number]
  setorId: string
  setorNome: string
  setorSigla: string
  isAdmin: boolean
  telaCheia: boolean
  onToggleTelaCheia: () => void
}) {
  const navigate = useNavigate()
  const frameRef = useRef<HTMLDivElement>(null)
  const [listaMobileAberta, setListaMobileAberta] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [pontos, setPontos] = useState<PontoComSetor[]>([])
  const [pontoSelecionado, setPontoSelecionado] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState("")
  const [modoAdicionar, setModoAdicionar] = useState(false)
  const [novoPontoPos, setNovoPontoPos] = useState<{ x: number; y: number } | null>(null)
  const [novoPontoCodigo, setNovoPontoCodigo] = useState("")
  const [nomePlanejado, setNomePlanejado] = useState("")
  const [pontoArmado, setPontoArmado] = useState<string | null>(null)
  const [salvandoPlanejado, setSalvandoPlanejado] = useState(false)
  const [wifi, setWifi] = useState<WifiComSetor[]>([])
  const [modoWifi, setModoWifi] = useState(false)
  const [novoWifiPos, setNovoWifiPos] = useState<{ x: number; y: number } | null>(null)
  const [novoWifiNome, setNovoWifiNome] = useState("")
  const [wifiSelecionado, setWifiSelecionado] = useState<string | null>(null)
  const [editWifiNome, setEditWifiNome] = useState("")
  const [editPontoCodigo, setEditPontoCodigo] = useState("")
  const [editPontoNome, setEditPontoNome] = useState("")
  const [zoomExtra, setZoomExtra] = useState(1)
  const [detalheEquipamento, setDetalheEquipamento] = useState<EquipamentoComSetor | null>(null)
  const [detalheLoading, setDetalheLoading] = useState(false)
  const [detalheErro, setDetalheErro] = useState<string | null>(null)
  const listRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const wifiListRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const pontosPosicionados = useMemo(() => pontos.filter((p) => p.x !== null && p.y !== null), [pontos])
  const pontosPlanejados = useMemo(
    () => pontos.filter((p) => (p.x === null || p.y === null) && p.setorId === setorId),
    [pontos, setorId]
  )

  async function recarregarPontos() {
    setPontos(await fetchPontos(nivel.id))
  }

  async function recarregarWifi() {
    setWifi(await fetchWifi(nivel.id))
  }

  useEffect(() => {
    recarregarPontos()
    recarregarWifi()
    setPontoSelecionado(null)
    setWifiSelecionado(null)
    setModoAdicionar(false)
    setModoWifi(false)
    setNovoPontoPos(null)
    setNovoWifiPos(null)
    setZoomExtra(1)
    setPontoArmado(null)
    setNomePlanejado("")
  }, [nivel.id, setorId])

  async function handleCriarWifi(novo: { nome: string; x: number; y: number }) {
    await criarWifi(nivel.id, setorId, novo)
    await recarregarWifi()
  }

  async function handleApagarWifi(w: WifiComSetor) {
    await apagarWifi(w.id)
    await recarregarWifi()
  }

  async function handleEditarWifi(w: WifiComSetor, nome: string) {
    await editarWifi(w.id, nome)
    await recarregarWifi()
  }

  async function handleCriarPonto(novo: { codigo: string; nome: string; x: number; y: number }) {
    await criarPonto(nivel.id, setorId, novo)
    await recarregarPontos()
  }

  async function handleCriarPlanejado() {
    if (!nomePlanejado.trim()) return
    setSalvandoPlanejado(true)
    try {
      const codigo = proximoCodigo(setorSigla, nivel.id, pontos)
      await criarPontoPlanejado(nivel.id, setorId, { codigo, nome: nomePlanejado.trim() })
      setNomePlanejado("")
      await recarregarPontos()
    } finally {
      setSalvandoPlanejado(false)
    }
  }

  async function handlePosicionar(pontoId: string, x: number, y: number) {
    await posicionarPonto(pontoId, x, y)
    setPontoArmado(null)
    await recarregarPontos()
  }

  async function handleApagarPonto(ponto: PontoComSetor) {
    await apagarPonto(ponto.id)
    await recarregarPontos()
  }

  async function handleEditarPonto(ponto: PontoComSetor, codigo: string, nome: string) {
    await editarPonto(ponto.id, { codigo, nome })
    await recarregarPontos()
  }

  useEffect(() => {
    async function compute() {
      const setores = await fetchSetores(nivel.id)
      const s = setores.find((r) => r.id === setorId)
      const frame = frameRef.current
      if (!s || !frame) return
      const rect = frame.getBoundingClientRect()
      const planW = PLAN_WIDTH
      const planH = PLAN_WIDTH * nivel.aspect
      const rx1 = (s.x1 / 100) * planW
      const rx2 = (s.x2 / 100) * planW
      const ry1 = (s.y1 / 100) * planH
      const ry2 = (s.y2 / 100) * planH
      const roomW = rx2 - rx1
      const roomH = ry2 - ry1
      const padding = 0.94
      const scale = Math.min(rect.width / roomW, rect.height / roomH) * padding * zoomExtra
      const bgW = planW * scale
      const bgH = planH * scale
      const cx = ((rx1 + rx2) / 2) * scale
      const cy = ((ry1 + ry2) / 2) * scale
      setStyle({
        width: bgW,
        height: bgH,
        left: 0,
        top: 0,
        backgroundImage: `url(${nivel.imagem})`,
        backgroundSize: `${bgW}px ${bgH}px`,
      })
      const targetScrollLeft = Math.min(Math.max(0, cx - rect.width / 2), Math.max(0, bgW - rect.width))
      const targetScrollTop = Math.min(Math.max(0, cy - rect.height / 2), Math.max(0, bgH - rect.height))
      requestAnimationFrame(() => {
        frame.scrollLeft = targetScrollLeft
        frame.scrollTop = targetScrollTop
      })
    }
    compute()
    window.addEventListener("resize", compute)
    return () => window.removeEventListener("resize", compute)
  }, [nivel, setorId, zoomExtra])

  function handleWheelSetor(e: React.WheelEvent) {
    if (!e.altKey || !e.shiftKey) return
    e.preventDefault()
    setZoomExtra((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.001)))
  }

  function fromPct(x: number, y: number) {
    const w = (style.width as number) || 0
    const h = (style.height as number) || 0
    const left = (style.left as number) || 0
    const top = (style.top as number) || 0
    return { left: left + (x / 100) * w, top: top + (y / 100) * h }
  }

  function toPct(clientX: number, clientY: number) {
    const frame = frameRef.current
    const w = style.width as number
    const h = style.height as number
    const left = style.left as number
    const top = style.top as number
    if (!frame || !w || !h) return null
    const rect = frame.getBoundingClientRect()
    const localX = clientX - rect.left + frame.scrollLeft - left
    const localY = clientY - rect.top + frame.scrollTop - top
    return { x: (localX / w) * 100, y: (localY / h) * 100 }
  }

  function handleFrameClick(e: React.MouseEvent) {
    if (pontoArmado) {
      const pos = toPct(e.clientX, e.clientY)
      if (!pos) return
      handlePosicionar(pontoArmado, pos.x, pos.y)
      return
    }
    if (modoAdicionar && !novoPontoPos) {
      const pos = toPct(e.clientX, e.clientY)
      if (!pos) return
      setNovoPontoPos(pos)
      setNovoPontoCodigo(proximoCodigo(setorSigla, nivel.id, pontos))
      return
    }
    if (modoWifi && !novoWifiPos) {
      const pos = toPct(e.clientX, e.clientY)
      if (!pos) return
      setNovoWifiPos(pos)
      setNovoWifiNome("")
    }
  }

  async function confirmarNovoWifi() {
    if (!novoWifiPos || !novoWifiNome.trim()) return
    await handleCriarWifi({ nome: novoWifiNome.trim(), x: novoWifiPos.x, y: novoWifiPos.y })
    setNovoWifiPos(null)
    setNovoWifiNome("")
  }

  async function removerWifi(w: WifiComSetor) {
    await handleApagarWifi(w)
    if (wifiSelecionado === w.id) setWifiSelecionado(null)
  }

  function abrirWifi(id: string) {
    setWifiSelecionado(id)
    setPontoSelecionado(null)
    setEditWifiNome(wifi.find((w) => w.id === id)?.nome ?? "")
    wifiListRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }

  async function confirmarNovoPonto() {
    if (!novoPontoPos || !novoPontoCodigo.trim()) return
    const codigo = novoPontoCodigo.trim().toUpperCase()
    await handleCriarPonto({
      codigo,
      nome: codigo,
      x: novoPontoPos.x,
      y: novoPontoPos.y,
    })
    setNovoPontoPos(null)
    setNovoPontoCodigo("")
  }

  async function removerPonto(pontoId: string) {
    const ponto = pontos.find((p) => p.id === pontoId)
    if (!ponto) return
    await handleApagarPonto(ponto)
    if (pontoSelecionado === pontoId) setPontoSelecionado(null)
  }

  function abrirPonto(pontoId: string) {
    setPontoSelecionado(pontoId)
    setWifiSelecionado(null)
    const p = pontos.find((x) => x.id === pontoId)
    setNovoNome(p?.equipamentoNome ?? "")
    setDetalheEquipamento(null)
    setDetalheErro(null)
    setEditPontoCodigo(p?.codigo ?? "")
    setEditPontoNome(p?.nome ?? "")
    listRefs.current[pontoId]?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }

  async function verDetalheEquipamento(equipamentoId: string) {
    setDetalheLoading(true)
    setDetalheErro(null)
    const { data, error } = await supabase
      .from("equipamentos")
      .select("*, setores(id, nome)")
      .eq("id", equipamentoId)
      .single()
    if (error) {
      setDetalheErro(error.message)
    } else {
      setDetalheEquipamento(data as EquipamentoComSetor)
    }
    setDetalheLoading(false)
  }

  async function confirmarEquipamento() {
    if (!pontoSelecionado || !novoNome.trim()) return
    await salvarEquipamentoDoPonto(pontoSelecionado, { equipamentoNome: novoNome.trim() })
    await recarregarPontos()
    setPontoSelecionado(null)
    setNovoNome("")
  }

  async function removerEquipamento(pontoId: string) {
    await removerEquipamentoDoPonto(pontoId)
    await recarregarPontos()
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-4">
        <button
          onClick={() => navigate("/mapa")}
          className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground sm:px-3 sm:text-sm"
        >
          <ChevronLeft className="size-3.5" />
          <span className="hidden sm:inline">Planta completa</span>
        </button>
        <div className="min-w-0">
          <p className="hidden text-xs uppercase tracking-wide text-muted-foreground sm:block">
            {nivel.nome} &middot; Setor
          </p>
          <h2 className="truncate text-sm font-semibold sm:text-lg">{setorNome}</h2>
        </div>
        <button
          onClick={onToggleTelaCheia}
          title={telaCheia ? "Sair da tela cheia" : "Ver em tela cheia"}
          className="flex size-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {telaCheia ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <button
            onClick={() => setZoomExtra((z) => Math.max(1, z - 0.2))}
            className="flex size-7 items-center justify-center rounded-md border hover:bg-accent"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="w-10 text-center font-mono">{Math.round(zoomExtra * 100)}%</span>
          <button
            onClick={() => setZoomExtra((z) => Math.min(4, z + 0.2))}
            className="flex size-7 items-center justify-center rounded-md border hover:bg-accent"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <span className="mr-2 hidden lg:inline">Alt + Shift + scroll para zoom</span>
        </div>
        <button
          onClick={() => setListaMobileAberta(true)}
          className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        >
          <List className="size-3.5" />
          Lista
        </button>
        {isAdmin && (
          <button
            onClick={() => {
              setModoWifi((v) => !v)
              setModoAdicionar(false)
              setNovoWifiPos(null)
              setNovoPontoPos(null)
              setPontoSelecionado(null)
            }}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              modoWifi
                ? "border-orange-500 bg-orange-500 text-white"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {modoWifi ? "Clique na planta para o Wi-Fi" : "Adicionar Wi-Fi"}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => {
              setModoAdicionar((v) => !v)
              setModoWifi(false)
              setNovoPontoPos(null)
              setNovoWifiPos(null)
              setPontoSelecionado(null)
            }}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              modoAdicionar
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {modoAdicionar ? "Clique na planta para adicionar" : "Adicionar ponto"}
          </button>
        )}
      </div>
      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_320px]">
        <div
          ref={frameRef}
          onClick={handleFrameClick}
          onWheel={handleWheelSetor}
          className={cn(
            "relative overflow-auto bg-muted/40",
            (modoAdicionar || modoWifi || pontoArmado) && "cursor-crosshair"
          )}
        >
          <div className="absolute bg-no-repeat" style={style} />

          {pontoArmado && (
            <div
              className="sticky left-2 top-2 z-20 inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              Clique na planta para posicionar "{pontos.find((p) => p.id === pontoArmado)?.nome}"
              <button
                onClick={() => setPontoArmado(null)}
                className="rounded-sm hover:bg-primary-foreground/20"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {wifi.map((w) => (
            <button
              key={w.id}
              onClick={(e) => {
                e.stopPropagation()
                abrirWifi(w.id)
              }}
              title="Clique para ver informacoes"
              className="absolute group"
              style={fromPct(w.x, w.y) as React.CSSProperties}
            >
              <WifiMarker nome={w.nome} />
            </button>
          ))}

          {wifiSelecionado &&
            (() => {
              const w = wifi.find((x) => x.id === wifiSelecionado)
              if (!w) return null
              const pos = fromPct(w.x, w.y)
              return (
                <div
                  className="absolute z-10 -translate-x-1/2 flex flex-col gap-2 rounded-lg border bg-card p-2 shadow-lg"
                  style={{ left: pos.left, top: pos.top }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isAdmin ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Input
                          value={editWifiNome}
                          onChange={(e) => setEditWifiNome(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleEditarWifi(w, editWifiNome.trim())}
                          className="h-8 w-40 text-xs"
                        />
                        <button
                          onClick={() => setWifiSelecionado(null)}
                          className="flex size-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditarWifi(w, editWifiNome.trim())}
                          disabled={!editWifiNome.trim()}
                          className="flex-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => removerWifi(w)}
                          className="flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-xs font-medium text-white"
                        >
                          <Trash2 className="size-3.5" />
                          Apagar
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="px-1 text-xs font-medium">{w.nome}</p>
                      <button
                        onClick={() => setWifiSelecionado(null)}
                        className="ml-auto flex size-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}

          {pontosPosicionados.length === 0 && !modoAdicionar && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Nenhum ponto posicionado nesta area ainda. Cadastre um ponto planejado na lista ao
              lado e clique em "Marcar no mapa", ou use "Adicionar ponto" para marcar direto.
            </div>
          )}

          {pontosPosicionados.map((p) => {
            const pos = fromPct(p.x as number, p.y as number)
            return (
              <button
                key={p.id}
                onClick={() => abrirPonto(p.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 group flex items-center justify-center"
                style={{ left: pos.left, top: pos.top }}
              >
                <span
                  className={cn(
                    "block size-3.5 rounded-full border-2 border-white shadow",
                    p.equipamentoNome ? "bg-blue-600" : "bg-muted-foreground"
                  )}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 flex-col items-center whitespace-nowrap rounded bg-foreground px-2 py-1 text-background opacity-0 shadow group-hover:opacity-100">
                  <span className="text-[9px] font-mono opacity-80">{p.codigo}</span>
                  <span className="text-[11px] font-medium">{p.equipamentoNome ?? p.nome}</span>
                </div>
              </button>
            )
          })}

          {pontoSelecionado &&
            (() => {
              const p = pontos.find((x) => x.id === pontoSelecionado)
              if (!p || p.x === null || p.y === null) return null
              const pos = fromPct(p.x, p.y)
              return (
                <div
                  className="absolute z-10 -translate-x-1/2 flex flex-col gap-2 rounded-lg border bg-card p-2 shadow-lg"
                  style={{ left: pos.left, top: pos.top }}
                >
                  {isAdmin ? (
                    <>
                      <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Local
                      </p>
                      <div className="flex items-center gap-1">
                        <Input
                          value={editPontoCodigo}
                          onChange={(e) => setEditPontoCodigo(e.target.value)}
                          className="h-8 w-24 text-xs font-mono"
                        />
                        <Input
                          value={editPontoNome}
                          onChange={(e) => setEditPontoNome(e.target.value)}
                          className="h-8 w-24 text-xs"
                        />
                        <button
                          onClick={() =>
                            handleEditarPonto(p, editPontoCodigo.trim().toUpperCase(), editPontoNome.trim())
                          }
                          disabled={!editPontoCodigo.trim() || !editPontoNome.trim()}
                          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
                        >
                          Salvar
                        </button>
                      </div>

                      <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Equipamento
                      </p>
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          value={novoNome}
                          onChange={(e) => setNovoNome(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && confirmarEquipamento()}
                          placeholder="Nome do equipamento"
                          className="h-8 w-40 text-xs"
                        />
                        <button
                          onClick={() => setPontoSelecionado(null)}
                          className="flex size-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={confirmarEquipamento}
                          disabled={!novoNome.trim()}
                          className="flex-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => removerPonto(pontoSelecionado)}
                          className="flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-xs font-medium text-white"
                        >
                          <Trash2 className="size-3.5" />
                          Apagar ponto
                        </button>
                      </div>
                      {p.equipamentoNome && (
                        <>
                          {p.equipamentoId && (
                            <button
                              onClick={() => verDetalheEquipamento(p.equipamentoId!)}
                              className="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              Ver informacoes do equipamento
                            </button>
                          )}
                          <DetalheEquipamentoCard
                            loading={detalheLoading}
                            erro={detalheErro}
                            equipamento={detalheEquipamento}
                          />
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">{p.codigo}</p>
                          <p className="text-sm font-medium">{p.equipamentoNome ?? p.nome}</p>
                        </div>
                        <button
                          onClick={() => setPontoSelecionado(null)}
                          className="ml-auto flex size-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      {p.equipamentoNome && (
                        <>
                          {p.equipamentoId && (
                            <button
                              onClick={() => verDetalheEquipamento(p.equipamentoId!)}
                              className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
                            >
                              Ver informacoes do equipamento
                            </button>
                          )}
                          <DetalheEquipamentoCard
                            loading={detalheLoading}
                            erro={detalheErro}
                            equipamento={detalheEquipamento}
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              )
            })()}

          {novoPontoPos && (
            <div
              className="absolute z-10 -translate-x-1/2 flex flex-col gap-2 rounded-lg border bg-card p-2 shadow-lg"
              style={{ left: fromPct(novoPontoPos.x, novoPontoPos.y).left, top: fromPct(novoPontoPos.x, novoPontoPos.y).top }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={novoPontoCodigo}
                  onChange={(e) => setNovoPontoCodigo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmarNovoPonto()}
                  placeholder="Codigo (ex: ALM-N2-P01)"
                  className="h-8 w-44 text-xs font-mono"
                />
                <button
                  onClick={() => setNovoPontoPos(null)}
                  className="flex size-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                >
                  <X className="size-4" />
                </button>
              </div>
              <button
                onClick={confirmarNovoPonto}
                disabled={!novoPontoCodigo.trim()}
                className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
              >
                Criar ponto
              </button>
            </div>
          )}

          {novoWifiPos && (
            <div
              className="absolute z-10 -translate-x-1/2 flex flex-col gap-2 rounded-lg border bg-card p-2 shadow-lg"
              style={{ left: fromPct(novoWifiPos.x, novoWifiPos.y).left, top: fromPct(novoWifiPos.x, novoWifiPos.y).top }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={novoWifiNome}
                  onChange={(e) => setNovoWifiNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmarNovoWifi()}
                  placeholder="Nome do ponto de Wi-Fi"
                  className="h-8 w-44 text-xs"
                />
                <button
                  onClick={() => setNovoWifiPos(null)}
                  className="flex size-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                >
                  <X className="size-4" />
                </button>
              </div>
              <button
                onClick={confirmarNovoWifi}
                disabled={!novoWifiNome.trim()}
                className="rounded-md bg-orange-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
              >
                Criar Wi-Fi
              </button>
            </div>
          )}
        </div>
        {listaMobileAberta && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setListaMobileAberta(false)}
          />
        )}
        <div
          className={cn(
            "overflow-y-auto border-l bg-card p-4",
            "fixed inset-x-0 bottom-0 z-50 max-h-[75vh] rounded-t-xl border-t shadow-lg transition-transform md:static md:z-auto md:max-h-none md:translate-y-0 md:rounded-none md:border-t-0 md:shadow-none",
            listaMobileAberta ? "translate-y-0" : "translate-y-full md:translate-y-0"
          )}
        >
          <div className="mb-2 flex items-center justify-between md:hidden">
            <span className="text-sm font-semibold">Pontos e Wi-Fi</span>
            <button
              onClick={() => setListaMobileAberta(false)}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          </div>
          {isAdmin && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pontos planejados neste setor ({pontosPlanejados.length})
              </h3>
              <div className="mb-2 flex items-center gap-1">
                <Input
                  value={nomePlanejado}
                  onChange={(e) => setNomePlanejado(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCriarPlanejado()}
                  placeholder="Ex: PC Recepcao, Impressora..."
                  className="h-8 text-xs"
                />
                <button
                  onClick={handleCriarPlanejado}
                  disabled={!nomePlanejado.trim() || salvandoPlanejado}
                  className="flex size-8 flex-shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {pontosPlanejados.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Cadastre aqui os pontos que esse setor vai ter, e depois clique em "Marcar no
                  mapa" para posicionar cada um na planta.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {pontosPlanejados.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm",
                        pontoArmado === p.id && "border-primary ring-2 ring-primary"
                      )}
                    >
                      <span className="flex-1 truncate">
                        {p.nome}
                        <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                          {p.codigo}
                        </span>
                      </span>
                      <button
                        onClick={() => setPontoArmado(pontoArmado === p.id ? null : p.id)}
                        className={cn(
                          "flex-shrink-0 rounded-md border px-2 py-1 text-xs font-medium",
                          pontoArmado === p.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {pontoArmado === p.id ? "Clique na planta" : "Marcar no mapa"}
                      </button>
                      <button
                        onClick={() => removerPonto(p.id)}
                        className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                        title="Remover"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pontos posicionados ({pontosPosicionados.length})
          </h3>
          {pontosPosicionados.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Nenhum ponto posicionado ainda.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pontosPosicionados.map((p) => (
                <div
                  key={p.id}
                  ref={(el) => {
                    listRefs.current[p.id] = el
                  }}
                  onClick={() => abrirPonto(p.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm hover:bg-accent",
                    pontoSelecionado === p.id && "ring-2 ring-primary"
                  )}
                >
                  <MapPin
                    className={cn(
                      "size-3.5 flex-shrink-0",
                      p.equipamentoNome ? "text-blue-600" : "text-muted-foreground"
                    )}
                  />
                  <div className="flex-1 truncate">
                    <p className="truncate leading-tight">{p.equipamentoNome ?? p.nome}</p>
                    <p className="truncate font-mono text-[10px] leading-tight text-muted-foreground">
                      {p.codigo}
                      {!p.equipamentoNome && " · sem equipamento"}
                      {p.setorId !== setorId && ` · ${p.setorNome}`}
                    </p>
                  </div>
                  {isAdmin && p.equipamentoNome && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removerEquipamento(p.id)
                      }}
                      title="Remover equipamento deste ponto"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removerPonto(p.id)
                      }}
                      title="Apagar ponto"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Cadastrar um equipamento sempre exige escolher um ponto existente. Por enquanto os
            pontos ainda podem ser apagados e recriados; quando estiver tudo certo, avise para eu
            travar a edicao (so admin podera mexer).
          </p>

          {wifi.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Wi-Fi nesta area ({wifi.length})
              </h3>
              <div className="flex flex-col gap-2">
                {wifi.map((w) => (
                  <div
                    key={w.id}
                    ref={(el) => {
                      wifiListRefs.current[w.id] = el
                    }}
                    onClick={() => abrirWifi(w.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm hover:bg-accent",
                      wifiSelecionado === w.id && "ring-2 ring-primary"
                    )}
                  >
                    <Wifi className="size-3.5 flex-shrink-0 text-orange-500" />
                    <span className="flex-1 truncate">{w.nome}</span>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removerWifi(w)
                        }}
                        title="Apagar Wi-Fi"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
