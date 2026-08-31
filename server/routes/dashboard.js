import { Router } from "express"
import { db } from "../db.js"
import { requireAuth } from "../auth.js"

export const dashboardRouter = Router()
dashboardRouter.use(requireAuth)

dashboardRouter.get("/counts", (req, res) => {
  const setores = db.prepare("SELECT COUNT(*) AS c FROM setores").get().c
  const equipamentos = db.prepare("SELECT COUNT(*) AS c FROM equipamentos").get().c
  const online = db
    .prepare("SELECT COUNT(*) AS c FROM equipamentos WHERE status = 'online'")
    .get().c
  const acessos = db.prepare("SELECT COUNT(*) AS c FROM acessos_equipamento").get().c

  res.json({ setores, equipamentos, online, acessos })
})
