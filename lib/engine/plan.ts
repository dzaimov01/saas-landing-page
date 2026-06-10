export interface PlanEdge {
  sourceId: string
  targetId: string
  sourceHandle: string | null
}

/**
 * The next node to run after `currentId`. For a condition node, pass the
 * evaluated `branch` ('true' | 'false') to follow the matching edge.
 * Single-path traversal (V1): returns the first matching edge target, or null.
 */
export function nextNodeId(
  currentId: string,
  edges: PlanEdge[],
  branch?: 'true' | 'false',
): string | null {
  const outgoing = edges.filter((e) => e.sourceId === currentId)
  if (branch) {
    const match = outgoing.find((e) => e.sourceHandle === branch)
    return match ? match.targetId : null
  }
  return outgoing.length > 0 ? outgoing[0].targetId : null
}
