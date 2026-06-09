'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div
          className={`flex items-center justify-between rounded-2xl px-5 py-3 transition-all duration-300 ${scrolled || open ? 'glass' : ''}`}
        >
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-cyan font-display text-base font-bold text-ink">
              C
            </span>
            <span className="font-display text-lg font-bold">Cadence</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-fog">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-fog">
              Pricing
            </a>
            <a href="#cta" className="transition-colors hover:text-fog">
              Customers
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden text-sm text-muted transition-colors hover:text-fog sm:inline"
            >
              Sign in
            </a>
            <a
              href="/signup"
              className="rounded-full bg-fog px-4 py-2 text-sm font-semibold text-ink transition-transform hover:scale-[1.04]"
            >
              Start free
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-fog hover:bg-white/5 md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav
            id="mobile-menu"
            className="glass mt-2 flex flex-col gap-1 rounded-2xl p-3 text-sm md:hidden"
          >
            {[
              { href: '#features', label: 'Features' },
              { href: '#pricing', label: 'Pricing' },
              { href: '#cta', label: 'Customers' },
              { href: '/login', label: 'Sign in' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-muted hover:bg-white/5 hover:text-fog"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
