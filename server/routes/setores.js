import { Router } from "express"
import { randomUUID } from "node:crypto"
import { db } from "../db.js"
import { requireAuth } from "../auth.js"

export const setoresRouter = Router()
setoresRouter.use(requireAuth)

setoresRouter.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM setores ORDER BY nome").all()
  res.json(rows)
})

setoresRouter.post("/", (req, res) => {
  const { nome, predio, andar } = req.body ?? {}
  if (!nome?.trim()) return res.status(400).json({ error: "Nome e obrigatorio" })

  const id = randomUUID()
  db.prepare("INSERT INTO setores (id, nome, predio, andar) VALUES (?, ?, ?, ?)").run(
    id,
    nome.trim(),
    predio || null,
    andar || null
  )
  res.status(201).json(db.prepare("SELECT * FROM setores WHERE id = ?").get(id))
})

setoresRouter.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM setores WHERE id = ?").run(req.params.id)
  res.status(204).end()
})
