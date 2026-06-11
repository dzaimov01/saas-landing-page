export interface TestResult {
  ok: boolean
  message: string
}

type Secret = Record<string, string>

async function probe(url: string, init: RequestInit, label = 'Working'): Promise<TestResult> {
  try {
    const res = await fetch(url, init)
    if (res.ok) return { ok: true, message: label }
    return { ok: false, message: `Failed (HTTP ${res.status})` }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Request failed' }
  }
}

/**
 * Verify a connection's credentials with a cheap, low-side-effect request per type.
 * Webhook types (slack/discord) post a one-line test message; everything else uses
 * a read-only authed GET. `secret` is the decrypted/refreshed credential.
 */
export async function testConnection(type: string, secret: Secret): Promise<TestResult> {
  switch (type) {
    case 'telegram':
      return probe(`https://api.telegram.org/bot${secret.botToken ?? ''}/getMe`, {})
    case 'airtable':
      return probe('https://api.airtable.com/v0/meta/whoami', {
        headers: { Authorization: `Bearer ${secret.apiKey ?? ''}` },
      })
    case 'notion':
      return probe('https://api.notion.com/v1/users/me', {
        headers: {
          Authorization: `Bearer ${secret.token ?? ''}`,
          'Notion-Version': '2022-06-28',
        },
      })
    case 'openai':
      return probe('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${secret.apiKey ?? ''}` },
      })
    case 'google_sheets':
      return probe('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${secret.accessToken ?? ''}` },
      })
    case 'hubspot':
      return probe('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: { Authorization: `Bearer ${secret.accessToken ?? ''}` },
      })
    case 'slack':
    case 'discord':
      return probe(
        secret.webhookUrl ?? '',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            type === 'slack'
              ? { text: 'Cadence connection test ✓' }
              : { content: 'Cadence connection test ✓' },
          ),
        },
        'Test message sent',
      )
    default:
      return { ok: false, message: `No test available for ${type}` }
  }
}
