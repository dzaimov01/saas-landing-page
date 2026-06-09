'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [saved, setSaved] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = String(new FormData(e.currentTarget).get('name'))
    await fetch('/api/settings/profile', { method: 'POST', body: JSON.stringify({ name: value }) })
    setSaved(true)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
      </div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit">Save</Button>
        {saved && <span className="text-sm text-cyan">Saved</span>}
      </div>
    </form>
  )
}
