'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { FormError } from '@/components/ui/FormError'

export default function SignupPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const body = {
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
    }
    const res = await fetch('/api/signup', { method: 'POST', body: JSON.stringify(body) })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    await signIn('credentials', { email: body.email, password: body.password, callbackUrl: '/app' })
  }

  return (
    <AuthCard title="Create your account" subtitle="Start automating in minutes.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating…' : 'Create account'}
        </Button>
      </form>
      <button
        onClick={() => signIn('google', { callbackUrl: '/app' })}
        className="mt-3 w-full rounded-full border border-line py-2.5 text-sm font-semibold transition-colors hover:bg-white/5"
      >
        Continue with Google
      </button>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-cyan">
          Log in
        </Link>
      </p>
    </AuthCard>
  )
}
