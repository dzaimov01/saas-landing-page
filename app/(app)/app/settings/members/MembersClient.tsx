'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Member = { id: string; role: 'OWNER' | 'ADMIN' | 'MEMBER'; email: string; name: string }

export function MembersClient({
  workspaceId,
  canManage,
  members,
}: {
  workspaceId: string
  canManage: boolean
  members: Member[]
}) {
  const [msg, setMsg] = useState('')

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/invitations', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        email: String(form.get('email')),
        role: String(form.get('role')),
      }),
    })
    setMsg(res.ok ? 'Invitation sent.' : 'Could not send invitation.')
  }

  async function act(membershipId: string, action: 'setRole' | 'remove', role?: string) {
    await fetch('/api/members', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, membershipId, action, role }),
    })
    window.location.reload()
  }

  return (
    <div className="space-y-8">
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              {m.name || m.email} <span className="text-muted">· {m.email}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-muted">{m.role}</span>
              {canManage && m.role !== 'OWNER' && (
                <>
                  <button
                    onClick={() => act(m.id, 'setRole', m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                    className="text-cyan"
                  >
                    Make {m.role === 'ADMIN' ? 'member' : 'admin'}
                  </button>
                  <button onClick={() => act(m.id, 'remove')} className="text-red-400">
                    Remove
                  </button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {canManage && (
        <form onSubmit={invite} className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium">
              Invite by email
            </label>
            <Input id="invite-email" name="email" type="email" required />
          </div>
          <select
            name="role"
            aria-label="Invite role"
            defaultValue="MEMBER"
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-fog"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <Button type="submit">Invite</Button>
        </form>
      )}
      {msg && <p className="text-sm text-cyan">{msg}</p>}
    </div>
  )
}
