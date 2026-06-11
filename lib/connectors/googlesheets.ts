import type { Connector } from './types'

export const googleSheetsAppend: Connector = async (config, _ctx, secret) => {
  const token = secret?.accessToken ?? ''
  if (!token) throw new Error('Google Sheets: no access token (reconnect the connection)')
  const spreadsheetId = String(config.spreadsheetId ?? '')
  const range = String(config.range ?? 'Sheet1!A1')
  const row = String(config.values ?? '')
    .split(',')
    .map((v) => v.trim())
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId,
  )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  })
  if (!res.ok) throw new Error(`Google Sheets append failed: ${res.status}`)
  return { appended: true }
}
