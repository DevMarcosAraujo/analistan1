import andar2 from "@/assets/plantas/andar-2.jpg"
import andar0 from "@/assets/plantas/andar-0.jpg"
import andarNeg1 from "@/assets/plantas/andar-neg1.jpg"
import andar1 from "@/assets/plantas/andar-1.jpg"

export interface Ponto {
  id: string
  codigo: string
  nome: string
  x: number
  y: number
}

export interface Setor {
  id: string
  nome: string
  sigla: string
  x1: number
  y1: number
  x2: number
  y2: number
  pontos: Ponto[]
}

export interface Nivel {
  id: string
  nome: string
  imagem: string
  aspect: number
  disponivel: boolean
  setores: Setor[]
}

export const NIVEIS: Nivel[] = [
  {
    id: "-2",
    nome: "Nivel -2",
    imagem: andar2,
    aspect: 7946 / 11234,
    disponivel: true,
    setores: [
      {
        id: "caf",
        nome: "Farmacia",
        sigla: "FAR",
        x1: 11.3,
        y1: 46.6,
        x2: 24.6,
        y2: 64.1,
        pontos: [],
      },
      {
        id: "carga-descarga",
        nome: "Carga e Descarga (Farmacia)",
        sigla: "CAR",
        x1: 12.2,
        y1: 47.6,
        x2: 14.9,
        y2: 54.7,
        pontos: [],
      },
      { id: "almoxarifado", nome: "Almoxarifado", sigla: "ALM", x1: 20.4, y1: 46.7, x2: 26.6, y2: 53.7, pontos: [] },
      {
        id: "corredor-farmacia",
        nome: "Corredor (Farmacia)",
        sigla: "COR",
        x1: 26.1,
        y1: 53.0,
        x2: 35.1,
        y2: 63.7,
        pontos: [],
      },
      {
        id: "sala-adm-farmacia",
        nome: "Sala ADM (Farmacia)",
        sigla: "ADM",
        x1: 24.3,
        y1: 56.8,
        x2: 30.2,
        y2: 63.9,
        pontos: [],
      },
      { id: "fracionamento", nome: "Fracionamento", sigla: "FRA", x1: 20.3, y1: 53.0, x2: 26.1, y2: 63.9, pontos: [] },
      { id: "morgue", nome: "Morgue", sigla: "MOR", x1: 70.7, y1: 47.7, x2: 73.4, y2: 55.0, pontos: [] },
      {
        id: "manutencao",
        nome: "Sala de Manutencao",
        sigla: "MAN",
        x1: 23.9,
        y1: 69.7,
        x2: 26.6,
        y2: 73.9,
        pontos: [],
      },
    ],
  },
  {
    id: "0",
    nome: "Nivel 0",
    imagem: andar0,
    aspect: 5960 / 8425,
    disponivel: true,
    setores: [],
  },
  {
    id: "-1",
    nome: "Nivel -1",
    imagem: andarNeg1,
    aspect: 3814 / 5392,
    disponivel: true,
    setores: [],
  },
  {
    id: "1",
    nome: "Nivel 1",
    imagem: andar1,
    aspect: 5245 / 7415,
    disponivel: true,
    setores: [],
  },
]

export const PLAN_WIDTH = 3200
