import { redirect } from 'next/navigation'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { listConnections } from '@/lib/connections'
import { listConnectionTypes } from '@/lib/connections/registry'
import { oauthEnabled } from '@/lib/connections/oauth'
import { encryptionEnabled } from '@/lib/crypto'
import { ConnectionsClient } from './ConnectionsClient'

export default async function ConnectionsPage() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  const connections = await listConnections(active.workspace.id)

  const types = listConnectionTypes()
    .filter((t) => t.auth !== 'oauth' || oauthEnabled(t.provider ?? ''))
    .map((t) => ({
      type: t.type,
      label: t.label,
      fields: t.fields,
      auth: t.auth,
      provider: t.provider ?? null,
    }))

  return (
    <ConnectionsClient
      enabled={encryptionEnabled()}
      types={types}
      connections={connections.map((c) => ({ id: c.id, type: c.type, name: c.name }))}
    />
  )
}
