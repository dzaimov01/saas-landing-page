import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import {
  oauthEnabled,
  exchangeCode,
  getOAuthProvider,
  type OAuthProviderId,
} from '@/lib/connections/oauth'
import { readStateToken } from '@/lib/connections/oauth-state'

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google Sheets',
  hubspot: 'HubSpot',
}

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookie = req.headers.get('cookie') ?? ''
  const raw = cookie
    .split(/;\s*/)
    .find((c) => c.startsWith('oauth_state='))
    ?.slice('oauth_state='.length)
  const saved = readStateToken(raw ? decodeURIComponent(raw) : undefined)

  const fail = () => NextResponse.redirect(new URL('/app/connections?error=oauth', req.url))

  if (!oauthEnabled(provider) || !code || !state || !saved) return fail()
  if (saved.provider !== provider || saved.state !== state) return fail()

  try {
    const tokens = await exchangeCode(provider as OAuthProviderId, code)
    const def = getOAuthProvider(provider)
    await db.connection.create({
      data: {
        workspaceId: saved.workspaceId,
        type: def.connectionType,
        name: `${PROVIDER_LABEL[provider] ?? provider} account`,
        secret: encrypt(JSON.stringify(tokens)),
      },
    })
  } catch {
    return fail()
  }
  const res = NextResponse.redirect(new URL(`/app/connections?connected=${provider}`, req.url))
  res.cookies.set('oauth_state', '', { path: '/', maxAge: 0 })
  return res
}
