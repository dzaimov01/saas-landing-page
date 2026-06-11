import { describe, it, expect } from 'vitest'
import { SCHEDULE_PRESETS, describeSchedule, nextRun, validateCron } from './schedule'

describe('schedule helpers', () => {
  it('exposes presets that map to {mode,value}', () => {
    const hourly = SCHEDULE_PRESETS.find((p) => p.id === 'hourly')!
    expect(hourly.config).toEqual({ mode: 'cron', value: '0 * * * *' })
    expect(SCHEDULE_PRESETS.find((p) => p.id === 'custom')).toBeTruthy()
  })

  it('describes an interval schedule', () => {
    expect(describeSchedule({ mode: 'interval', value: '15' })).toBe('Every 15 minutes')
    expect(describeSchedule({ mode: 'interval', value: '1' })).toBe('Every minute')
  })

  it('describes a cron schedule in words', () => {
    expect(describeSchedule({ mode: 'cron', value: '0 9 * * 1' }).toLowerCase()).toContain('9')
    expect(describeSchedule({ mode: 'cron', value: 'not a cron' })).toBe('Invalid cron expression')
  })

  it('computes next run for an interval', () => {
    const from = new Date('2026-06-11T10:00:00Z')
    expect(nextRun({ mode: 'interval', value: '15' }, from)?.toISOString()).toBe(
      '2026-06-11T10:15:00.000Z',
    )
  })

  it('computes next run for a cron and validates expressions', () => {
    const from = new Date('2026-06-11T10:00:00Z')
    const next = nextRun({ mode: 'cron', value: '0 * * * *' }, from)
    expect(next?.toISOString()).toBe('2026-06-11T11:00:00.000Z')
    expect(validateCron('0 9 * * 1')).toBe(true)
    expect(validateCron('nope')).toBe(false)
  })
})
