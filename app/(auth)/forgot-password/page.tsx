'use client'

import { useState } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email'))
    await fetch('/api/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) })
    setSent(true)
  }

  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a reset link.">
      {sent ? (
        <p className="text-muted">If that email exists, a reset link is on its way.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
