import { Router } from "express"
import { randomUUID } from "node:crypto"
import { db } from "../db.js"
import { requireAuth } from "../auth.js"
import { encrypt, decrypt } from "../crypto.js"

export const acessosRouter = Router()
acessosRouter.use(requireAuth)

const SELECT_WITH_EQUIPAMENTO = `
  SELECT a.*, e.id AS equipamento_id_join, e.nome AS equipamento_nome
  FROM acessos_equipamento a
  LEFT JOIN equipamentos e ON e.id = a.equipamento_id
  ORDER BY a.criado_em DESC
`

function mapRow(row) {
  const { equipamento_id_join, equipamento_nome, senha_criptografada, ...ac } = row
  return {
    ...ac,
    tem_senha: !!senha_criptografada,
    equipamentos: equipamento_nome ? { id: equipamento_id_join, nome: equipamento_nome } : null,
  }
}

acessosRouter.get("/", (req, res) => {
  const rows = db.prepare(SELECT_WITH_EQUIPAMENTO).all()
  res.json(rows.map(mapRow))
})

acessosRouter.post("/", (req, res) => {
  const { equipamento_id, tipo_acesso, url_ou_ip, usuario, porta, senha } = req.body ?? {}
  if (!equipamento_id) return res.status(400).json({ error: "Equipamento e obrigatorio" })
  if (!tipo_acesso) return res.status(400).json({ error: "Tipo de acesso e obrigatorio" })

  const id = randomUUID()
  const senhaCriptografada = senha?.trim() ? encrypt(senha.trim()) : null

  db.prepare(
    `INSERT INTO acessos_equipamento
      (id, equipamento_id, tipo_acesso, url_ou_ip, usuario, senha_criptografada, porta)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    equipamento_id,
    tipo_acesso,
    url_ou_ip || null,
    usuario || null,
    senhaCriptografada,
    porta || null
  )

  const row = db
    .prepare(SELECT_WITH_EQUIPAMENTO.replace("ORDER BY a.criado_em DESC", "WHERE a.id = ?"))
    .get(id)
  res.status(201).json(mapRow(row))
})

acessosRouter.patch("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM acessos_equipamento WHERE id = ?")
    .get(req.params.id)
  if (!existing) return res.status(404).json({ error: "Acesso nao encontrado" })

  const { tipo_acesso, url_ou_ip, usuario, porta, senha } = req.body ?? {}

  const senhaCriptografada =
    senha === undefined
      ? existing.senha_criptografada
      : senha?.trim()
        ? encrypt(senha.trim())
        : null

  db.prepare(
    `UPDATE acessos_equipamento
     SET tipo_acesso = ?, url_ou_ip = ?, usuario = ?, porta = ?, senha_criptografada = ?
     WHERE id = ?`
  ).run(
    tipo_acesso ?? existing.tipo_acesso,
    url_ou_ip !== undefined ? url_ou_ip || null : existing.url_ou_ip,
    usuario !== undefined ? usuario || null : existing.usuario,
    porta !== undefined ? porta || null : existing.porta,
    senhaCriptografada,
    req.params.id
  )

  const row = db
    .prepare(SELECT_WITH_EQUIPAMENTO.replace("ORDER BY a.criado_em DESC", "WHERE a.id = ?"))
    .get(req.params.id)
  res.json(mapRow(row))
})

acessosRouter.get("/:id/senha", (req, res) => {
  const row = db
    .prepare("SELECT senha_criptografada FROM acessos_equipamento WHERE id = ?")
    .get(req.params.id)

  if (!row || !row.senha_criptografada) {
    return res.status(404).json({ error: "Senha nao cadastrada" })
  }

  res.json({ senha: decrypt(row.senha_criptografada) })
})

acessosRouter.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM acessos_equipamento WHERE id = ?").run(req.params.id)
  res.status(204).end()
})
