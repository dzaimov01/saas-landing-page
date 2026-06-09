const cols = [
  { h: 'Product', links: ['Features', 'Integrations', 'Pricing', 'Changelog'] },
  { h: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
  { h: 'Resources', links: ['Docs', 'API', 'Status', 'Security'] },
]

export default function Footer() {
  return (
    <footer className="border-t border-line py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 pb-12 md:grid-cols-[1.4fr,1fr,1fr,1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-cyan font-display text-base font-bold text-ink">
                C
              </span>
              <span className="font-display text-lg font-bold">Cadence</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted">
              Automation that runs your busywork, so your team can do the work that matters.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <p className="mb-3 text-sm font-semibold text-fog">{c.h}</p>
              <ul className="space-y-2 text-sm text-muted">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="transition-colors hover:text-fog">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-line pt-8 text-sm text-muted md:flex-row">
          <p>© {new Date().getFullYear()} Cadence Labs Inc.</p>
          <p>
            Designed &amp; built by{' '}
            <a href="https://seido-blond.vercel.app" className="text-fog hover:text-cyan">
              SEIDO
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
