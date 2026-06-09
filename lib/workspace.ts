import { db } from './db'
import { slugify } from './slug'

export async function createPersonalWorkspace({ userId, name }: { userId: string; name: string }) {
  const display = `${name}'s workspace`
  let slug = slugify(display)
  while (await db.workspace.findUnique({ where: { slug } })) {
    slug = slugify(display, { withSuffix: true })
  }
  const workspace = await db.workspace.create({ data: { name: display, slug } })
  await db.membership.create({ data: { userId, workspaceId: workspace.id, role: 'OWNER' } })
  return workspace
}
