'use client'

import { signOut } from 'next-auth/react'

export function UserMenu({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-muted sm:inline">{email}</span>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="rounded-lg border border-line px-3 py-1.5 transition-colors hover:bg-white/5"
      >
        Sign out
      </button>
    </div>
  )
}
