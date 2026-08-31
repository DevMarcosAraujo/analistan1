import "./env.js"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import crypto from "node:crypto"
import { db } from "./db.js"
import { encrypt, decrypt } from "./crypto.js"

const PORT = 3001
const ADMIN = { id: "1", email: "admin@local", senha: "admin123" }

const sessions = new Map()

const app = express()
app.use(cors({ origin: "http://localhost:5173", credentials: true }))
app.use(express.json())
app.use(cookieParser())

function requireSession(req, res, next) {
  const user = sessions.get(req.cookies.session)
  if (!user) return res.status(401).json({ error: "Nao autenticado" })
  next()
}

app.post("/api/auth/login", (req, res) => {
  const { email, senha } = req.body ?? {}
  if (email !== ADMIN.email || senha !== ADMIN.senha) {
    return res.status(401).json({ error: "Email ou senha invalidos" })
  }
  const token = crypto.randomUUID()
  sessions.set(token, { id: ADMIN.id, email: ADMIN.email })
  res.cookie("session", token, { httpOnly: true, sameSite: "lax" })
  res.json({ id: ADMIN.id, email: ADMIN.email })
})

app.get("/api/auth/me", (req, res) => {
  const user = sessions.get(req.cookies.session)
  if (!user) return res.status(401).json({ error: "Nao autenticado" })
  res.json(user)
})

app.post("/api/auth/logout", (req, res) => {
  sessions.delete(req.cookies.session)
  res.clearCookie("session")
  res.status(204).end()
})

app.use("/api/setores", requireSession)
app.use("/api/equipamentos", requireSession)
app.use("/api/acessos", requireSession)

// ---------- Setores ----------

app.get("/api/setores", (req, res) => {
  const setores = db.prepare("SELECT * FROM setores ORDER BY nome").all()
  res.json(setores)
})

app.post("/api/setores", (req, res) => {
  const { nome, predio, andar } = req.body ?? {}
  if (!nome || !nome.trim()) return res.status(400).json({ error: "Nome e obrigatorio" })
  const id = crypto.randomUUID()
  db.prepare("INSERT INTO setores (id, nome, predio, andar) VALUES (?, ?, ?, ?)").run(
    id,
    nome.trim(),
    predio ?? null,
    andar ?? null
  )
  const setor = db.prepare("SELECT * FROM setores WHERE id = ?").get(id)
  res.status(201).json(setor)
})

app.delete("/api/setores/:id", (req, res) => {
  db.prepare("DELETE FROM setores WHERE id = ?").run(req.params.id)
  res.status(204).end()
})

// ---------- Equipamentos ----------

function comSetor(eq) {
  if (!eq) return eq
  const { setor_nome, ...rest } = eq
  return {
    ...rest,
    setores: rest.setor_id ? { id: rest.setor_id, nome: setor_nome } : null,
  }
}

app.get("/api/equipamentos", (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.*, s.nome AS setor_nome
       FROM equipamentos e
       LEFT JOIN setores s ON s.id = e.setor_id
       ORDER BY e.nome`
    )
    .all()
  res.json(rows.map(comSetor))
})

app.get("/api/equipamentos/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT e.*, s.nome AS setor_nome FROM equipamentos e LEFT JOIN setores s ON s.id = e.setor_id WHERE e.id = ?`
    )
    .get(req.params.id)
  if (!row) return res.status(404).json({ error: "Equipamento nao encontrado" })
  res.json(comSetor(row))
})

app.post("/api/equipamentos", (req, res) => {
  const {
    tipo,
    nome,
    patrimonio,
    fabricante,
    modelo,
    numero_serie,
    ip,
    mac,
    setor_id,
    sala,
    responsavel,
    switch_porta,
    status,
    observacao,
    mapa_nivel_id,
    mapa_setor_id,
    mapa_setor_nome,
    mapa_ponto_id,
    mapa_ponto_codigo,
  } = req.body ?? {}
  if (!nome || !nome.trim()) return res.status(400).json({ error: "Nome e obrigatorio" })
  if (!tipo) return res.status(400).json({ error: "Tipo e obrigatorio" })
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO equipamentos
      (id, tipo, nome, patrimonio, fabricante, modelo, numero_serie, ip, mac, setor_id, sala, responsavel, switch_porta, status, observacao,
       mapa_nivel_id, mapa_setor_id, mapa_setor_nome, mapa_ponto_id, mapa_ponto_codigo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    tipo,
    nome.trim(),
    patrimonio ?? null,
    fabricante ?? null,
    modelo ?? null,
    numero_serie ?? null,
    ip ?? null,
    mac ?? null,
    setor_id ?? null,
    sala ?? null,
    responsavel ?? null,
    switch_porta ?? null,
    status ?? "desconhecido",
    observacao ?? null,
    mapa_nivel_id ?? null,
    mapa_setor_id ?? null,
    mapa_setor_nome ?? null,
    mapa_ponto_id ?? null,
    mapa_ponto_codigo ?? null
  )
  const row = db
    .prepare(
      `SELECT e.*, s.nome AS setor_nome FROM equipamentos e LEFT JOIN setores s ON s.id = e.setor_id WHERE e.id = ?`
    )
    .get(id)
  res.status(201).json(comSetor(row))
})

app.patch("/api/equipamentos/:id", (req, res) => {
  const existente = db.prepare("SELECT * FROM equipamentos WHERE id = ?").get(req.params.id)
  if (!existente) return res.status(404).json({ error: "Equipamento nao encontrado" })
  const campos = [
    "tipo",
    "nome",
    "patrimonio",
    "fabricante",
    "modelo",
    "numero_serie",
    "ip",
    "mac",
    "setor_id",
    "sala",
    "responsavel",
    "switch_porta",
    "status",
    "observacao",
    "mapa_nivel_id",
    "mapa_setor_id",
    "mapa_setor_nome",
    "mapa_ponto_id",
    "mapa_ponto_codigo",
  ]
  const atualizado = { ...existente }
  for (const campo of campos) {
    if (campo in (req.body ?? {})) atualizado[campo] = req.body[campo]
  }
  db.prepare(
    `UPDATE equipamentos SET tipo=?, nome=?, patrimonio=?, fabricante=?, modelo=?, numero_serie=?, ip=?, mac=?, setor_id=?, sala=?, responsavel=?, switch_porta=?, status=?, observacao=?,
       mapa_nivel_id=?, mapa_setor_id=?, mapa_setor_nome=?, mapa_ponto_id=?, mapa_ponto_codigo=?
     WHERE id=?`
  ).run(
    atualizado.tipo,
    atualizado.nome,
    atualizado.patrimonio,
    atualizado.fabricante,
    atualizado.modelo,
    atualizado.numero_serie,
    atualizado.ip,
    atualizado.mac,
    atualizado.setor_id,
    atualizado.sala,
    atualizado.responsavel,
    atualizado.switch_porta,
    atualizado.status,
    atualizado.observacao,
    atualizado.mapa_nivel_id,
    atualizado.mapa_setor_id,
    atualizado.mapa_setor_nome,
    atualizado.mapa_ponto_id,
    atualizado.mapa_ponto_codigo,
    req.params.id
  )
  const row = db
    .prepare(
      `SELECT e.*, s.nome AS setor_nome FROM equipamentos e LEFT JOIN setores s ON s.id = e.setor_id WHERE e.id = ?`
    )
    .get(req.params.id)
  res.json(comSetor(row))
})

app.delete("/api/equipamentos/:id", (req, res) => {
  db.prepare("DELETE FROM equipamentos WHERE id = ?").run(req.params.id)
  res.status(204).end()
})

// ---------- Acessos ----------

function comEquipamento(ac) {
  if (!ac) return ac
  const { equipamento_nome, senha_criptografada, ...rest } = ac
  return {
    ...rest,
    tem_senha: !!senha_criptografada,
    equipamentos: rest.equipamento_id ? { id: rest.equipamento_id, nome: equipamento_nome } : null,
  }
}

app.get("/api/acessos", (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, e.nome AS equipamento_nome
       FROM acessos_equipamento a
       LEFT JOIN equipamentos e ON e.id = a.equipamento_id
       ORDER BY a.criado_em DESC`
    )
    .all()
  res.json(rows.map(comEquipamento))
})

app.post("/api/acessos", (req, res) => {
  const { equipamento_id, tipo_acesso, url_ou_ip, usuario, porta, senha, observacao } = req.body ?? {}
  if (!equipamento_id) return res.status(400).json({ error: "Equipamento e obrigatorio" })
  if (!tipo_acesso) return res.status(400).json({ error: "Tipo de acesso e obrigatorio" })
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO acessos_equipamento (id, equipamento_id, tipo_acesso, url_ou_ip, usuario, senha_criptografada, porta, observacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    equipamento_id,
    tipo_acesso,
    url_ou_ip ?? null,
    usuario ?? null,
    senha ? encrypt(senha) : null,
    porta ?? null,
    observacao ?? null
  )
  const row = db
    .prepare(
      `SELECT a.*, e.nome AS equipamento_nome FROM acessos_equipamento a LEFT JOIN equipamentos e ON e.id = a.equipamento_id WHERE a.id = ?`
    )
    .get(id)
  res.status(201).json(comEquipamento(row))
})

app.patch("/api/acessos/:id", (req, res) => {
  const existente = db.prepare("SELECT * FROM acessos_equipamento WHERE id = ?").get(req.params.id)
  if (!existente) return res.status(404).json({ error: "Acesso nao encontrado" })
  const { tipo_acesso, url_ou_ip, usuario, porta, senha, observacao } = req.body ?? {}
  const atualizado = {
    tipo_acesso: tipo_acesso ?? existente.tipo_acesso,
    url_ou_ip: url_ou_ip !== undefined ? url_ou_ip : existente.url_ou_ip,
    usuario: usuario !== undefined ? usuario : existente.usuario,
    porta: porta !== undefined ? porta : existente.porta,
    observacao: observacao !== undefined ? observacao : existente.observacao,
    senha_criptografada: senha ? encrypt(senha) : existente.senha_criptografada,
  }
  db.prepare(
    `UPDATE acessos_equipamento SET tipo_acesso=?, url_ou_ip=?, usuario=?, porta=?, observacao=?, senha_criptografada=?
     WHERE id=?`
  ).run(
    atualizado.tipo_acesso,
    atualizado.url_ou_ip,
    atualizado.usuario,
    atualizado.porta,
    atualizado.observacao,
    atualizado.senha_criptografada,
    req.params.id
  )
  const row = db
    .prepare(
      `SELECT a.*, e.nome AS equipamento_nome FROM acessos_equipamento a LEFT JOIN equipamentos e ON e.id = a.equipamento_id WHERE a.id = ?`
    )
    .get(req.params.id)
  res.json(comEquipamento(row))
})

app.get("/api/acessos/:id/senha", (req, res) => {
  const row = db.prepare("SELECT senha_criptografada FROM acessos_equipamento WHERE id = ?").get(req.params.id)
  if (!row || !row.senha_criptografada) return res.status(404).json({ error: "Sem senha cadastrada" })
  res.json({ senha: decrypt(row.senha_criptografada) })
})

app.delete("/api/acessos/:id", (req, res) => {
  db.prepare("DELETE FROM acessos_equipamento WHERE id = ?").run(req.params.id)
  res.status(204).end()
})

// ---------- Dashboard ----------

app.get("/api/dashboard/counts", (req, res) => {
  const setores = db.prepare("SELECT COUNT(*) AS n FROM setores").get().n
  const equipamentos = db.prepare("SELECT COUNT(*) AS n FROM equipamentos").get().n
  const online = db.prepare("SELECT COUNT(*) AS n FROM equipamentos WHERE status = 'online'").get().n
  const acessos = db.prepare("SELECT COUNT(*) AS n FROM acessos_equipamento").get().n
  res.json({ setores, equipamentos, online, acessos })
})

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`)
  console.log(`Login de teste: ${ADMIN.email} / ${ADMIN.senha}`)
})
