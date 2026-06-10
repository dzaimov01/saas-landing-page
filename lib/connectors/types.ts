import type { RunContext } from '../template'

/** A resolved connection secret (decrypted credential fields), if the step uses one. */
export type ConnectionSecret = Record<string, string> | undefined

export type Connector = (
  config: Record<string, unknown>,
  ctx: RunContext,
  secret?: ConnectionSecret,
) => Promise<unknown>
