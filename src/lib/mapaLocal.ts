import { NIVEIS, type Setor, type Ponto } from "@/data/plantaBaixa"

function setoresKey(nivelId: string) {
  return `mapa:setores-custom:${nivelId}`
}

function setoresRemovidosKey(nivelId: string) {
  return `mapa:setores-removidos:${nivelId}`
}

function pontosKey(nivelId: string, setorId: string) {
  return `mapa:pontos-custom:${nivelId}:${setorId}`
}

function equipamentosKey(nivelId: string) {
  return `mapa:pontos-equip:${nivelId}`
}

export const NIVEIS_DISPONIVEIS = NIVEIS.filter((n) => n.disponivel)

export function setoresDoNivel(nivelId: string): Setor[] {
  const nivel = NIVEIS.find((n) => n.id === nivelId)
  if (!nivel) return []
  const rawRemovidos = localStorage.getItem(setoresRemovidosKey(nivelId))
  const removidos: string[] = rawRemovidos ? JSON.parse(rawRemovidos) : []
  const rawCustom = localStorage.getItem(setoresKey(nivelId))
  const custom: Setor[] = rawCustom ? JSON.parse(rawCustom) : []
  return [...nivel.setores, ...custom].filter((s) => !removidos.includes(s.id))
}

export function pontosDoSetor(nivelId: string, setorId: string): Ponto[] {
  const setor = setoresDoNivel(nivelId).find((s) => s.id === setorId)
  const base = setor?.pontos ?? []
  const rawCustom = localStorage.getItem(pontosKey(nivelId, setorId))
  const custom: Ponto[] = rawCustom ? JSON.parse(rawCustom) : []
  return [...base, ...custom]
}

export function vincularEquipamentoAoPonto(
  nivelId: string,
  pontoId: string,
  nome: string,
  equipamentoId?: string
) {
  const raw = localStorage.getItem(equipamentosKey(nivelId))
  const atuais = raw ? JSON.parse(raw) : {}
  atuais[pontoId] = { nome, equipamentoId }
  localStorage.setItem(equipamentosKey(nivelId), JSON.stringify(atuais))
}

export function desvincularPonto(nivelId: string, pontoId: string) {
  const raw = localStorage.getItem(equipamentosKey(nivelId))
  if (!raw) return
  const atuais = JSON.parse(raw)
  delete atuais[pontoId]
  localStorage.setItem(equipamentosKey(nivelId), JSON.stringify(atuais))
}
