import { describe, it, expect } from 'vitest'
import { nextNodeId } from './plan'

const edges = [
  { sourceId: 't', targetId: 'c', sourceHandle: null },
  { sourceId: 'c', targetId: 'a', sourceHandle: 'true' },
  { sourceId: 'c', targetId: 'b', sourceHandle: 'false' },
]

describe('nextNodeId', () => {
  it('follows a plain edge', () => {
    expect(nextNodeId('t', edges)).toBe('c')
  })
  it('follows the true branch of a condition', () => {
    expect(nextNodeId('c', edges, 'true')).toBe('a')
  })
  it('follows the false branch of a condition', () => {
    expect(nextNodeId('c', edges, 'false')).toBe('b')
  })
  it('returns null at a leaf', () => {
    expect(nextNodeId('a', edges)).toBeNull()
  })
})
