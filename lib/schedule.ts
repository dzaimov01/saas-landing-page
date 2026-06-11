import { CronExpressionParser } from 'cron-parser'
import cronstrue from 'cronstrue'

export interface ScheduleValue {
  mode: 'interval' | 'cron'
  value: string
}

export interface SchedulePreset {
  id: string
  label: string
  config: ScheduleValue | null // null = custom
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { id: 'every15', label: 'Every 15 minutes', config: { mode: 'interval', value: '15' } },
  { id: 'hourly', label: 'Every hour', config: { mode: 'cron', value: '0 * * * *' } },
  { id: 'daily9', label: 'Every day at 9:00', config: { mode: 'cron', value: '0 9 * * *' } },
  { id: 'weeklyMon9', label: 'Every Monday at 9:00', config: { mode: 'cron', value: '0 9 * * 1' } },
  { id: 'custom', label: 'Custom…', config: null },
]

export function validateCron(value: string): boolean {
  try {
    CronExpressionParser.parse(value)
    return true
  } catch {
    return false
  }
}

export function describeSchedule({ mode, value }: ScheduleValue): string {
  if (mode === 'interval') {
    const n = Math.max(1, Number(value) || 1)
    return n === 1 ? 'Every minute' : `Every ${n} minutes`
  }
  try {
    return cronstrue.toString(value)
  } catch {
    return 'Invalid cron expression'
  }
}

export function nextRun({ mode, value }: ScheduleValue, from: Date = new Date()): Date | null {
  if (mode === 'interval') {
    const n = Math.max(1, Number(value) || 1)
    return new Date(from.getTime() + n * 60_000)
  }
  try {
    const it = CronExpressionParser.parse(value, { currentDate: from, tz: 'UTC' })
    return it.next().toDate()
  } catch {
    return null
  }
}
