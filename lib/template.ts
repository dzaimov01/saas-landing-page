export type RunContext = Record<string, unknown>

/** Resolve a dot-path like "trigger.body.email" against a context object. */
export function resolvePath(path: string, ctx: RunContext): unknown {
  return path
    .trim()
    .split('.')
    .reduce<unknown>((acc, key) => {
      if (acc != null && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key]
      }
      return undefined
    }, ctx)
}

/** Replace every {{ path }} in a string with its context value; non-strings pass through. */
export function interpolate(value: unknown, ctx: RunContext): unknown {
  if (typeof value !== 'string') return value
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, path: string) => {
    const resolved = resolvePath(path, ctx)
    return resolved === undefined || resolved === null ? '' : String(resolved)
  })
}

/** Interpolate every field of a config object. */
export function resolveConfig(
  config: Record<string, unknown>,
  ctx: RunContext,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(config)) out[k] = interpolate(v, ctx)
  return out
}
