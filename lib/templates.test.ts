import { describe, it, expect } from 'vitest'
import { TEMPLATES } from './templates'
import { getStepType } from './steps/registry'

describe('workflow templates', () => {
  it.each(TEMPLATES.map((t) => [t.key, t] as const))('%s is structurally valid', (_key, tpl) => {
    // unique node ids
    const ids = tpl.nodes.map((nd) => nd.id)
    expect(new Set(ids).size).toBe(ids.length)

    // every node type is known
    for (const nd of tpl.nodes) expect(() => getStepType(nd.type)).not.toThrow()

    // exactly one trigger
    const triggers = tpl.nodes.filter((nd) => getStepType(nd.type).kind === 'TRIGGER')
    expect(triggers).toHaveLength(1)

    // every non-trigger node is reachable from the trigger
    const adjacency = new Map<string, string[]>()
    for (const ed of tpl.edges) {
      adjacency.set(ed.sourceId, [...(adjacency.get(ed.sourceId) ?? []), ed.targetId])
    }
    const seen = new Set<string>([triggers[0].id])
    const stack = [triggers[0].id]
    while (stack.length) {
      for (const next of adjacency.get(stack.pop() as string) ?? []) {
        if (!seen.has(next)) {
          seen.add(next)
          stack.push(next)
        }
      }
    }
    for (const nd of tpl.nodes) expect(seen.has(nd.id)).toBe(true)
  })
})
