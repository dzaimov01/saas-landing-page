'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { FormError } from '@/components/ui/FormError'

function LoginForm() {
  const callbackUrl = useSearchParams().get('callbackUrl') ?? '/app'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const res = await signIn('credentials', {
      email: String(form.get('email')),
      password: String(form.get('password')),
      redirect: false,
    })
    if (res?.error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    window.location.href = callbackUrl
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
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
            autoComplete="current-password"
            required
          />
        </div>
        <FormError>{error}</FormError>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <button
        onClick={() => signIn('google', { callbackUrl })}
        className="mt-3 w-full rounded-full border border-line py-2.5 text-sm font-semibold transition-colors hover:bg-white/5"
      >
        Continue with Google
      </button>
      <p className="mt-6 text-sm text-muted">
        <Link href="/forgot-password" className="text-cyan">
          Forgot password?
        </Link>{' '}
        · No account?{' '}
        <Link href="/signup" className="text-cyan">
          Sign up
        </Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}
