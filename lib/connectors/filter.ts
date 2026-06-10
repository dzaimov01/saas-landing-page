import type { Connector } from './types'
import { evaluate, type ConditionConfig } from '../engine/condition'

/** Returns { passed }. The engine stops the run when passed === false. */
export const filter: Connector = async (config, ctx) => {
  const passed = evaluate(
    {
      field: String(config.field ?? ''),
      operator: (config.operator as ConditionConfig['operator']) ?? 'eq',
      value: String(config.value ?? ''),
    },
    ctx,
  )
  return { passed }
}
