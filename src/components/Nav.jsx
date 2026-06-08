import { useEffect, useState } from 'react'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className={`flex items-center justify-between rounded-2xl px-5 py-3 transition-all duration-300 ${scrolled ? 'glass' : ''}`}>
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-cyan font-display text-base font-bold text-base">C</span>
            <span className="font-display text-lg font-bold">Cadence</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-fog">Features</a>
            <a href="#pricing" className="transition-colors hover:text-fog">Pricing</a>
            <a href="#cta" className="transition-colors hover:text-fog">Customers</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="#cta" className="hidden text-sm text-muted transition-colors hover:text-fog sm:inline">Sign in</a>
            <a href="#pricing" className="rounded-full bg-fog px-4 py-2 text-sm font-semibold text-base transition-transform hover:scale-[1.04]">
              Start free
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
