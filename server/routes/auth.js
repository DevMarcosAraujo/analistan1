import { Router } from "express"
import bcrypt from "bcryptjs"
import { db } from "../db.js"
import { signToken, requireAuth } from "../auth.js"

export const authRouter = Router()

const isProd = process.env.NODE_ENV === "production"

authRouter.post("/login", (req, res) => {
  const { email, senha } = req.body ?? {}
  if (!email || !senha) return res.status(400).json({ error: "Informe email e senha" })

  const user = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email)
  if (!user || !bcrypt.compareSync(senha, user.senha_hash)) {
    return res.status(401).json({ error: "Email ou senha invalidos" })
  }

  const token = signToken(user)
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  res.json({ id: user.id, email: user.email })
})

authRouter.post("/logout", (req, res) => {
  res.clearCookie("token")
  res.json({ ok: true })
})

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ id: req.user.sub, email: req.user.email })
})
