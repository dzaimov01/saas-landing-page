import { randomBytes } from 'node:crypto'

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function expiryFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000)
}
