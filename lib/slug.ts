export function slugify(input: string, opts: { withSuffix?: boolean } = {}): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
  if (!opts.withSuffix) return base
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}
