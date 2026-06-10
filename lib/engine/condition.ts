import { resolvePath, type RunContext } from '../template'

export interface ConditionConfig {
  field: string
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt'
  value: string
}

export function evaluate(config: ConditionConfig, ctx: RunContext): boolean {
  const actual = resolvePath(config.field, ctx)
  const expected = config.value

  switch (config.operator) {
    case 'eq':
      return String(actual) === expected
    case 'neq':
      return String(actual) !== expected
    case 'contains':
      return String(actual ?? '').includes(expected)
    case 'gt':
      return Number(actual) > Number(expected)
    case 'lt':
      return Number(actual) < Number(expected)
    default:
      return false
  }
}
