import { supabase } from "@/lib/supabase"
import { NIVEIS, type Nivel, type Ponto, type Setor } from "@/data/plantaBaixa"

export interface WifiPonto {
  id: string
  nome: string
  x: number
  y: number
}

export interface PontoComSetor extends Ponto {
  setorId: string
  setorNome: string
  equipamentoNome?: string
  equipamentoId?: string
}

export interface WifiComSetor extends WifiPonto {
  setorId: string
}

function nivelBase(nivelId: string): Nivel {
  return NIVEIS.find((n) => n.id === nivelId)!
}

export async function fetchSetores(nivelId: string): Promise<Setor[]> {
  const base = nivelBase(nivelId)
  const [{ data: custom }, { data: removidos }] = await Promise.all([
    supabase.from("mapa_setores").select("*").eq("nivel_id", nivelId),
    supabase.from("mapa_setores_removidos").select("setor_id").eq("nivel_id", nivelId),
  ])
  const removidosIds = new Set((removidos ?? []).map((r) => r.setor_id))
  const customSetores: Setor[] = (custom ?? []).map((s) => ({
    id: s.id,
    nome: s.nome,
    sigla: s.sigla,
    x1: Number(s.x1),
    y1: Number(s.y1),
    x2: Number(s.x2),
    y2: Number(s.y2),
    pontos: [],
  }))
  return [...base.setores, ...customSetores].filter((s) => !removidosIds.has(s.id))
}

export async function criarSetor(nivelId: string, setor: Setor) {
  const { error } = await supabase.from("mapa_setores").insert({
    id: setor.id,
    nivel_id: nivelId,
    nome: setor.nome,
    sigla: setor.sigla,
    x1: setor.x1,
    y1: setor.y1,
    x2: setor.x2,
    y2: setor.y2,
  })
  if (error) throw error
}

export async function editarSetor(setorId: string, patch: { nome: string; sigla: string }) {
  const { error } = await supabase.from("mapa_setores").update(patch).eq("id", setorId)
  if (error) throw error
}

export async function apagarSetor(nivelId: string, setorId: string) {
  const base = nivelBase(nivelId)
  const isBase = base.setores.some((s) => s.id === setorId)
  if (isBase) {
    const { error } = await supabase
      .from("mapa_setores_removidos")
      .upsert({ nivel_id: nivelId, setor_id: setorId })
    if (error) throw error
  } else {
    const { error } = await supabase.from("mapa_setores").delete().eq("id", setorId)
    if (error) throw error
  }
}

export async function fetchPontos(nivelId: string): Promise<PontoComSetor[]> {
  const setores = await fetchSetores(nivelId)
  const nomesPorId = new Map(setores.map((s) => [s.id, s.nome]))
  const { data, error } = await supabase.from("mapa_pontos").select("*").eq("nivel_id", nivelId)
  if (error) throw error
  return (data ?? [])
    .filter((p) => nomesPorId.has(p.setor_id))
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      x: Number(p.x),
      y: Number(p.y),
      setorId: p.setor_id,
      setorNome: nomesPorId.get(p.setor_id) ?? "",
      equipamentoNome: p.equipamento_nome ?? undefined,
      equipamentoId: p.equipamento_id ?? undefined,
    }))
}

export async function criarPonto(
  nivelId: string,
  setorId: string,
  ponto: { codigo: string; nome: string; x: number; y: number }
) {
  const { error } = await supabase.from("mapa_pontos").insert({
    nivel_id: nivelId,
    setor_id: setorId,
    codigo: ponto.codigo,
    nome: ponto.nome,
    x: ponto.x,
    y: ponto.y,
  })
  if (error) throw error
}

export async function editarPonto(pontoId: string, patch: { codigo: string; nome: string }) {
  const { error } = await supabase.from("mapa_pontos").update(patch).eq("id", pontoId)
  if (error) throw error
}

export async function apagarPonto(pontoId: string) {
  const { error } = await supabase.from("mapa_pontos").delete().eq("id", pontoId)
  if (error) throw error
}

export async function salvarEquipamentoDoPonto(
  pontoId: string,
  patch: { equipamentoNome: string; equipamentoId?: string }
) {
  const { error } = await supabase
    .from("mapa_pontos")
    .update({ equipamento_nome: patch.equipamentoNome, equipamento_id: patch.equipamentoId ?? null })
    .eq("id", pontoId)
  if (error) throw error
}

export async function removerEquipamentoDoPonto(pontoId: string) {
  const { error } = await supabase
    .from("mapa_pontos")
    .update({ equipamento_nome: null, equipamento_id: null })
    .eq("id", pontoId)
  if (error) throw error
}

export async function fetchWifi(nivelId: string): Promise<WifiComSetor[]> {
  const { data, error } = await supabase.from("mapa_wifi").select("*").eq("nivel_id", nivelId)
  if (error) throw error
  return (data ?? []).map((w) => ({
    id: w.id,
    nome: w.nome,
    x: Number(w.x),
    y: Number(w.y),
    setorId: w.setor_id,
  }))
}

export async function criarWifi(
  nivelId: string,
  setorId: string,
  wifi: { nome: string; x: number; y: number }
) {
  const { error } = await supabase.from("mapa_wifi").insert({
    nivel_id: nivelId,
    setor_id: setorId,
    nome: wifi.nome,
    x: wifi.x,
    y: wifi.y,
  })
  if (error) throw error
}

export async function editarWifi(wifiId: string, nome: string) {
  const { error } = await supabase.from("mapa_wifi").update({ nome }).eq("id", wifiId)
  if (error) throw error
}

export async function apagarWifi(wifiId: string) {
  const { error } = await supabase.from("mapa_wifi").delete().eq("id", wifiId)
  if (error) throw error
}
