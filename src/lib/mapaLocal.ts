import { NIVEIS, type Setor } from "@/data/plantaBaixa"
import { fetchSetores, fetchPontos, salvarEquipamentoDoPonto, removerEquipamentoDoPonto, type PontoComSetor } from "@/lib/mapaData"

export const NIVEIS_DISPONIVEIS = NIVEIS.filter((n) => n.disponivel)

export async function setoresDoNivel(nivelId: string): Promise<Setor[]> {
  return fetchSetores(nivelId)
}

export async function pontosDoSetor(nivelId: string, setorId: string): Promise<PontoComSetor[]> {
  const pontos = await fetchPontos(nivelId)
  return pontos.filter((p) => p.setorId === setorId)
}

export async function vincularEquipamentoAoPonto(
  nivelId: string,
  pontoId: string,
  nome: string,
  equipamentoId?: string
) {
  void nivelId
  await salvarEquipamentoDoPonto(pontoId, { equipamentoNome: nome, equipamentoId })
}

export async function desvincularPonto(nivelId: string, pontoId: string) {
  void nivelId
  await removerEquipamentoDoPonto(pontoId)
}
