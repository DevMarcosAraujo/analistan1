export type TipoEquipamento =
  | "computador"
  | "impressora"
  | "tablet"
  | "camera"
  | "telefone"
  | "switch"
  | "servidor"
  | "access_point"
  | "outro"

export type StatusEquipamento = "online" | "offline" | "manutencao" | "desconhecido"

export type TipoAcesso = "painel_web" | "teamviewer" | "rdp" | "ssh" | "outro"

export interface Setor {
  id: string
  nome: string
  predio: string | null
  andar: string | null
  criado_em: string
}

export interface Equipamento {
  id: string
  tipo: TipoEquipamento
  nome: string
  patrimonio: string | null
  fabricante: string | null
  modelo: string | null
  numero_serie: string | null
  ip: string | null
  mac: string | null
  setor_id: string | null
  sala: string | null
  responsavel: string | null
  switch_porta: string | null
  status: StatusEquipamento
  observacao: string | null
  mapa_nivel_id: string | null
  mapa_setor_id: string | null
  mapa_setor_nome: string | null
  mapa_ponto_id: string | null
  mapa_ponto_codigo: string | null
  criado_em: string
}

export interface EquipamentoComSetor extends Equipamento {
  setores: Pick<Setor, "id" | "nome"> | null
}

export interface AcessoEquipamento {
  id: string
  equipamento_id: string
  tipo_acesso: TipoAcesso
  url_ou_ip: string | null
  usuario: string | null
  tem_senha: boolean
  porta: string | null
  observacao: string | null
  criado_em: string
}
