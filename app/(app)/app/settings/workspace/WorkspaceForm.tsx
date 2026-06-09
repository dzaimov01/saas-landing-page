'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export function WorkspaceForm({
  workspaceId,
  name,
  canEdit,
}: {
  workspaceId: string
  name: string
  canEdit: boolean
}) {
  const [saved, setSaved] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = String(new FormData(e.currentTarget).get('name'))
    await fetch('/api/settings/workspace', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, name: value }),
    })
    setSaved(true)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="wsname">Workspace name</Label>
        <Input id="wsname" name="name" defaultValue={name} disabled={!canEdit} required />
      </div>
      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button type="submit">Save</Button>
          {saved && <span className="text-sm text-cyan">Saved</span>}
        </div>
      ) : (
        <p className="text-sm text-muted">Only owners and admins can edit the workspace.</p>
      )}
    </form>
  )
}
