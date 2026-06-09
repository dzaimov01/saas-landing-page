import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Acme Corp')).toBe('acme-corp')
  })
  it('strips non-alphanumerics and collapses dashes', () => {
    expect(slugify('  Hello,   World!! ')).toBe('hello-world')
  })
  it('appends a short suffix when asked for uniqueness', () => {
    const s = slugify('Acme', { withSuffix: true })
    expect(s).toMatch(/^acme-[a-z0-9]{4,6}$/)
  })
})
