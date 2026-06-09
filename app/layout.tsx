import type { Metadata } from 'next'
import { Sora, Manrope } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
})
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: 'Cadence — Automation that runs your busywork',
  description:
    'Cadence turns repetitive team workflows into automations that run themselves. Connect your stack, set the rules, and let it work.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='24' fill='%237c5cff'/%3E%3Cpath d='M30 62 L46 38 L54 54 L70 32' stroke='white' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  },
  openGraph: {
    title: 'Cadence — Automation that runs your busywork',
    description:
      'Cadence turns repetitive team workflows into automations that run themselves.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cadence — Automation that runs your busywork',
    description:
      'Cadence turns repetitive team workflows into automations that run themselves.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
