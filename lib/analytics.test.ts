import { describe, it, expect } from 'vitest'
import { summarizeRuns } from './analytics'

const now = new Date('2026-06-11T12:00:00Z')

function run(status: string, daysAgo: number, workflowName = 'W1') {
  return {
    status,
    createdAt: new Date(now.getTime() - daysAgo * 86_400_000),
    workflowId: workflowName,
    workflowName,
  }
}

describe('summarizeRuns', () => {
  it('counts statuses and success rate', () => {
    const s = summarizeRuns([run('SUCCEEDED', 0), run('SUCCEEDED', 1), run('FAILED', 1)], {
      now,
      days: 7,
    })
    expect(s.total).toBe(3)
    expect(s.succeeded).toBe(2)
    expect(s.failed).toBe(1)
    expect(s.successRate).toBe(67) // round(2/3*100)
  })

  it('returns 0 success rate with no finished runs', () => {
    const s = summarizeRuns([run('RUNNING', 0)], { now, days: 7 })
    expect(s.successRate).toBe(0)
    expect(s.active).toBe(1)
  })

  it('zero-fills perDay to the window length, oldest first', () => {
    const s = summarizeRuns([run('SUCCEEDED', 0)], { now, days: 14 })
    expect(s.perDay).toHaveLength(14)
    expect(s.perDay[13].date).toBe('2026-06-11')
    expect(s.perDay[13].succeeded).toBe(1)
    expect(s.perDay[0].succeeded).toBe(0)
  })

  it('ranks top workflows by count, max 5', () => {
    const runs = [
      run('SUCCEEDED', 0, 'A'),
      run('SUCCEEDED', 0, 'A'),
      run('FAILED', 0, 'B'),
    ]
    const s = summarizeRuns(runs, { now, days: 7 })
    expect(s.topWorkflows[0]).toEqual({ name: 'A', count: 2 })
    expect(s.topWorkflows.length).toBeLessThanOrEqual(5)
  })
})
