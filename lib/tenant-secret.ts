// ============================================================
// Cifrado del secreto de ingesta de cada tenant.
//
// El panel central no verifica un secreto que le presentan (como una
// contraseña, donde alcanzaría un hash) — al revés: es EL PANEL quien tiene
// que presentarle el secreto a cada tenant al llamar a su
// /api/internal/subscription-status. Por eso necesita poder recuperar el
// valor original, no solo compararlo. Se cifra con AES-256-GCM en vez de
// guardarlo en texto plano: si la base se filtra sola (sin la env var
// TENANT_SECRET_ENCRYPTION_KEY, que vive solo en Vercel), los secretos de
// los clientes siguen protegidos.
// ============================================================

import crypto from 'node:crypto'

function key(): Buffer {
  const hex = process.env.TENANT_SECRET_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'Falta o es inválida TENANT_SECRET_ENCRYPTION_KEY (debe ser 32 bytes en hex, 64 caracteres). Generarla con: openssl rand -hex 32'
    )
  }
  return Buffer.from(hex, 'hex')
}

/** Guarda el formato "iv:authTag:ciphertext", todo en hex. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
}

export function decryptSecret(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(':')
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Formato inválido de ingest_secret_encrypted')
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()])
  return plaintext.toString('utf8')
}
