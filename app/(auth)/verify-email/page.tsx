import Link from 'next/link'
import { db } from '@/lib/db'

export default async function VerifyEmail({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token, email } = await searchParams
  let ok = false
  if (token && email) {
    const row = await db.verificationToken.findUnique({ where: { token } })
    if (row && row.identifier === email && row.expires > new Date()) {
      await db.user.update({ where: { email }, data: { emailVerified: new Date() } })
      await db.verificationToken.delete({ where: { token } })
      ok = true
    }
  }
  return (
    <main id="main" className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">
        {ok ? 'Email verified' : 'Invalid or expired link'}
      </h1>
      <Link href="/app" className="mt-6 inline-block text-cyan">
        Go to Cadence →
      </Link>
    </main>
  )
}
