import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('crypto', () => {
  it('round-trips a secret', async () => {
    const { encrypt, decrypt } = await import('./crypto')
    const blob = encrypt('sk_live_secret-value')
    expect(blob).not.toContain('sk_live_secret-value')
    expect(decrypt(blob)).toBe('sk_live_secret-value')
  })
  it('detects tampering', async () => {
    const { encrypt, decrypt } = await import('./crypto')
    const blob = encrypt('hello')
    const [iv, tag, ct] = blob.split('.')
    const tampered = [iv, tag, Buffer.from('garbage').toString('base64')].join('.')
    expect(() => decrypt(tampered)).toThrow()
  })
  it('reports enabled with a valid key', async () => {
    const { encryptionEnabled } = await import('./crypto')
    expect(encryptionEnabled()).toBe(true)
  })
})
