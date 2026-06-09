import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('s3cret-pass')
    expect(hash).not.toBe('s3cret-pass')
    expect(await verifyPassword('s3cret-pass', hash)).toBe(true)
  })
  it('rejects a wrong password', async () => {
    const hash = await hashPassword('s3cret-pass')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
