import { DatabaseSync } from "node:sqlite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import bcrypt from "bcryptjs"
import { randomUUID } from "node:crypto"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH || path.join(__dirname, "data", "app.db")

export const db = new DatabaseSync(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS setores (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    predio TEXT,
    andar TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipamentos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    nome TEXT NOT NULL,
    patrimonio TEXT,
    fabricante TEXT,
    modelo TEXT,
    numero_serie TEXT,
    ip TEXT,
    mac TEXT,
    setor_id TEXT REFERENCES setores(id) ON DELETE SET NULL,
    sala TEXT,
    responsavel TEXT,
    switch_porta TEXT,
    status TEXT NOT NULL DEFAULT 'desconhecido',
    observacao TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS acessos_equipamento (
    id TEXT PRIMARY KEY,
    equipamento_id TEXT NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
    tipo_acesso TEXT NOT NULL,
    url_ou_ip TEXT,
    usuario TEXT,
    senha_criptografada TEXT,
    porta TEXT,
    observacao TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_equipamentos_setor ON equipamentos(setor_id);
  CREATE INDEX IF NOT EXISTS idx_acessos_equipamento ON acessos_equipamento(equipamento_id);
`)

// Migracao leve: adiciona colunas de localizacao no mapa (nivel/setor/ponto)
// se ainda nao existirem, sem apagar dados existentes.
const colunasEquipamentos = db.prepare("PRAGMA table_info(equipamentos)").all().map((c) => c.name)
for (const [coluna, def] of [
  ["mapa_nivel_id", "TEXT"],
  ["mapa_setor_id", "TEXT"],
  ["mapa_setor_nome", "TEXT"],
  ["mapa_ponto_id", "TEXT"],
  ["mapa_ponto_codigo", "TEXT"],
]) {
  if (!colunasEquipamentos.includes(coluna)) {
    db.exec(`ALTER TABLE equipamentos ADD COLUMN ${coluna} ${def}`)
  }
}

// Usuario padrao para o primeiro login local (troque a senha depois)
const existeUsuario = db.prepare("SELECT id FROM usuarios LIMIT 1").get()
if (!existeUsuario) {
  const hash = bcrypt.hashSync("admin123", 10)
  db.prepare("INSERT INTO usuarios (id, email, senha_hash) VALUES (?, ?, ?)").run(
    randomUUID(),
    "admin@local",
    hash
  )
  console.log("Usuario padrao criado: admin@local / admin123 (troque depois)")
}
