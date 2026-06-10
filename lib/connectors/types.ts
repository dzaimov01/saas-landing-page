import type { RunContext } from '../template'

export type Connector = (
  config: Record<string, unknown>,
  ctx: RunContext,
) => Promise<unknown>
