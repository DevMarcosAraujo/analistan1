import { Router } from "express"
import { randomUUID } from "node:crypto"
import { db } from "../db.js"
import { requireAuth } from "../auth.js"

export const equipamentosRouter = Router()
equipamentosRouter.use(requireAuth)

const SELECT_WITH_SETOR = `
  SELECT e.*, s.id AS setor_id_join, s.nome AS setor_nome
  FROM equipamentos e
  LEFT JOIN setores s ON s.id = e.setor_id
  ORDER BY e.nome
`

function mapRow(row) {
  const { setor_id_join, setor_nome, ...eq } = row
  return {
    ...eq,
    setores: setor_nome ? { id: setor_id_join, nome: setor_nome } : null,
  }
}

equipamentosRouter.get("/", (req, res) => {
  const rows = db.prepare(SELECT_WITH_SETOR).all()
  res.json(rows.map(mapRow))
})

equipamentosRouter.post("/", (req, res) => {
  const { tipo, nome, patrimonio, ip, setor_id, sala, responsavel, status } = req.body ?? {}
  if (!nome?.trim()) return res.status(400).json({ error: "Nome e obrigatorio" })
  if (!tipo) return res.status(400).json({ error: "Tipo e obrigatorio" })

  const id = randomUUID()
  db.prepare(
    `INSERT INTO equipamentos
      (id, tipo, nome, patrimonio, ip, setor_id, sala, responsavel, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tipo,
    nome.trim(),
    patrimonio || null,
    ip || null,
    setor_id || null,
    sala || null,
    responsavel || null,
    status || "desconhecido"
  )

  const row = db
    .prepare(SELECT_WITH_SETOR.replace("ORDER BY e.nome", "WHERE e.id = ?"))
    .get(id)
  res.status(201).json(mapRow(row))
})

equipamentosRouter.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM equipamentos WHERE id = ?").run(req.params.id)
  res.status(204).end()
})
