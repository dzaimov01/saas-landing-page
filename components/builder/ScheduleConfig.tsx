'use client'

import { useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  SCHEDULE_PRESETS,
  describeSchedule,
  nextRun,
  validateCron,
  type ScheduleValue,
} from '@/lib/schedule'

export function ScheduleConfig({
  config,
  canEdit,
  onChange,
}: {
  config: Partial<ScheduleValue>
  canEdit: boolean
  onChange: (patch: Partial<ScheduleValue>) => void
}) {
  const current: ScheduleValue = { mode: config.mode ?? 'interval', value: config.value ?? '15' }
  const presetId = useMemo(() => {
    const match = SCHEDULE_PRESETS.find(
      (p) => p.config && p.config.mode === current.mode && p.config.value === current.value,
    )
    return match?.id ?? 'custom'
  }, [current.mode, current.value])

  const cronInvalid = current.mode === 'cron' && !validateCron(current.value)
  const next = nextRun(current)

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="schedule-preset">Frequency</Label>
        <select
          id="schedule-preset"
          value={presetId}
          disabled={!canEdit}
          onChange={(e) => {
            const preset = SCHEDULE_PRESETS.find((p) => p.id === e.target.value)
            if (preset?.config) onChange(preset.config)
            else onChange({ mode: 'cron', value: current.value || '0 9 * * *' })
          }}
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fog"
        >
          {SCHEDULE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {presetId === 'custom' && (
        <>
          <div>
            <Label htmlFor="schedule-mode">Mode</Label>
            <select
              id="schedule-mode"
              value={current.mode}
              disabled={!canEdit}
              onChange={(e) => onChange({ mode: e.target.value as ScheduleValue['mode'] })}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fog"
            >
              <option value="interval">Every N minutes</option>
              <option value="cron">Cron expression</option>
            </select>
          </div>
          <div>
            <Label htmlFor="schedule-value">{current.mode === 'cron' ? 'Cron' : 'Minutes'}</Label>
            <Input
              id="schedule-value"
              value={current.value}
              disabled={!canEdit}
              placeholder={current.mode === 'cron' ? '0 9 * * 1' : '15'}
              onChange={(e) => onChange({ value: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="rounded-lg border border-line bg-surface p-3 text-sm">
        {cronInvalid ? (
          <p className="text-red-300">Invalid cron expression</p>
        ) : (
          <>
            <p className="text-fog">{describeSchedule(current)}</p>
            {next && <p className="mt-1 text-xs text-muted">Next run: {next.toUTCString()}</p>}
          </>
        )}
      </div>
    </div>
  )
}
