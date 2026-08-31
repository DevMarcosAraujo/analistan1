import crypto from "node:crypto"

const rawKey = process.env.ENCRYPTION_KEY
if (!rawKey || rawKey.length < 32) {
  throw new Error(
    "ENCRYPTION_KEY ausente ou curta demais em server/.env (precisa de pelo menos 32 caracteres)"
  )
}
const key = crypto.createHash("sha256").update(rawKey).digest()

export function encrypt(text) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

export function decrypt(payload) {
  const buf = Buffer.from(payload, "base64")
  const iv = buf.subarray(0, 16)
  const authTag = buf.subarray(16, 32)
  const encrypted = buf.subarray(32)
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}
