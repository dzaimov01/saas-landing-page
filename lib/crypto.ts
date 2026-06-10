import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function key(): Buffer {
  const raw = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'base64')
  if (raw.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be the base64 encoding of 32 random bytes.')
  }
  return raw
}

export function encryptionEnabled(): boolean {
  try {
    key()
    return true
  } catch {
    return false
  }
}

/** AES-256-GCM encrypt → "iv.tag.ciphertext" (all base64). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.')
}

export function decrypt(blob: string): string {
  const [ivB64, tagB64, ctB64] = blob.split('.')
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Invalid ciphertext')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
