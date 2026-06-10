import { describe, it, expect, vi, afterEach } from 'vitest'
import { logger, formatEntry } from './logger'

afterEach(() => vi.restoreAllMocks())

describe('logger', () => {
  it('routes error to console.error with the message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('boom', { runId: 'r1' })
    expect(spy).toHaveBeenCalledOnce()
    expect(String(spy.mock.calls[0][0])).toContain('boom')
    expect(String(spy.mock.calls[0][0])).toContain('r1')
  })
  it('routes info to console.info', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    logger.info('hello')
    expect(spy).toHaveBeenCalledOnce()
  })
  it('formats an entry containing the message and meta', () => {
    const out = formatEntry('warn', 'careful', { x: 1 })
    expect(out).toContain('careful')
    expect(out).toContain('1')
  })
})
