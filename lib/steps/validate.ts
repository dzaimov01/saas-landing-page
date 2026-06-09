import { getStepType, STEP_TYPES } from './registry'

export interface GraphNode {
  id: string
  type: string
  config: unknown
}
export interface GraphEdge {
  sourceId: string
  targetId: string
  sourceHandle: string | null
}

export function validateWorkflow(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { errors: string[] } {
  const errors: string[] = []

  // Unknown node types
  const known = nodes.filter((n) => STEP_TYPES[n.type])
  for (const n of nodes) {
    if (!STEP_TYPES[n.type]) errors.push(`Unknown step type "${n.type}".`)
  }

  // Exactly one trigger
  const triggers = known.filter((n) => getStepType(n.type).kind === 'TRIGGER')
  if (triggers.length === 0) errors.push('Add a trigger to start the workflow.')
  if (triggers.length > 1) errors.push('A workflow can have only one trigger.')

  // Config validity
  for (const n of known) {
    const res = getStepType(n.type).configSchema.safeParse(n.config)
    if (!res.success) errors.push(`Step "${n.type}" has invalid config.`)
  }

  // Condition branches
  for (const n of known) {
    if (getStepType(n.type).kind !== 'CONDITION') continue
    const out = edges.filter((e) => e.sourceId === n.id)
    if (!out.some((e) => e.sourceHandle === 'true'))
      errors.push('A condition is missing its "true" branch.')
    if (!out.some((e) => e.sourceHandle === 'false'))
      errors.push('A condition is missing its "false" branch.')
  }

  // Reachability from the trigger (only when exactly one trigger)
  if (triggers.length === 1) {
    const start = triggers[0].id
    const adjacency = new Map<string, string[]>()
    for (const e of edges) {
      const list = adjacency.get(e.sourceId) ?? []
      list.push(e.targetId)
      adjacency.set(e.sourceId, list)
    }
    const seen = new Set<string>([start])
    const stack = [start]
    while (stack.length) {
      const cur = stack.pop() as string
      for (const next of adjacency.get(cur) ?? []) {
        if (!seen.has(next)) {
          seen.add(next)
          stack.push(next)
        }
      }
    }
    for (const n of known) {
      if (!seen.has(n.id)) errors.push(`Step "${n.type}" is not reachable from the trigger.`)
    }
  }

  return { errors }
}
