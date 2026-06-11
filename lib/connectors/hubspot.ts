import type { Connector } from './types'

export const hubspotCreateContact: Connector = async (config, _ctx, secret) => {
  const token = secret?.accessToken ?? ''
  if (!token) throw new Error('HubSpot: no access token (reconnect the connection)')
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        email: String(config.email ?? ''),
        firstname: String(config.firstname ?? ''),
        lastname: String(config.lastname ?? ''),
      },
    }),
  })
  if (!res.ok) throw new Error(`HubSpot create contact failed: ${res.status}`)
  const json = (await res.json()) as { id?: string }
  return { created: true, id: json.id }
}
