'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const tabs = [
  { href: '/app/settings/profile', label: 'Profile' },
  { href: '/app/settings/workspace', label: 'Workspace' },
  { href: '/app/settings/members', label: 'Members' },
  { href: '/app/settings/billing', label: 'Billing' },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="mb-8 flex gap-1 border-b border-line">
      {tabs.map((t) => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-violet text-fog'
                : 'border-transparent text-muted hover:text-fog',
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
