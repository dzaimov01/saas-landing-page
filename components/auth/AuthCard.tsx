import Link from 'next/link'

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-cyan font-display text-base font-bold text-ink">
          C
        </span>
        <span className="font-display text-lg font-bold">Cadence</span>
      </Link>
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </main>
  )
}
