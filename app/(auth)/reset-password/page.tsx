'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { FormError } from '@/components/ui/FormError'

function ResetForm() {
  const token = useSearchParams().get('token') ?? ''
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const password = String(new FormData(e.currentTarget).get('password'))
    const res = await fetch('/api/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <p className="text-muted">
        Password updated.{' '}
        <Link href="/login" className="text-cyan">
          Log in →
        </Link>
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <FormError>{error}</FormError>
      <Button type="submit" className="w-full">
        Update password
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthCard>
  )
}
