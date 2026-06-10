import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service — Cadence' }

export default function TermsPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-20">
      <Link href="/" className="text-sm text-muted hover:text-fog">
        ← Back to Cadence
      </Link>
      <h1 className="mt-4 font-display text-4xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">Last updated: 9 June 2026</p>

      <div className="mt-8 space-y-6 text-fog/90 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-fog [&_p]:mt-2 [&_p]:text-muted">
        <section>
          <h2>1. Agreement</h2>
          <p>
            These Terms govern your access to and use of Cadence (the “Service”), operated by
            [Company], [Address]. By creating an account or using the Service you agree to these
            Terms. If you do not agree, do not use the Service.
          </p>
        </section>
        <section>
          <h2>2. Accounts</h2>
          <p>
            You are responsible for safeguarding your account credentials and for all activity under
            your account and workspace. You must provide accurate information and promptly update it.
          </p>
        </section>
        <section>
          <h2>3. Acceptable use</h2>
          <p>
            You agree not to misuse the Service, including by attempting unauthorised access,
            disrupting the Service, sending unlawful or abusive content through automations, or
            violating the rights of others. You are responsible for the workflows you create and the
            requests they make to third-party systems.
          </p>
        </section>
        <section>
          <h2>4. Plans &amp; billing</h2>
          <p>
            Paid plans are billed in advance on a recurring basis through our payment processor.
            Plan limits (workflow counts and monthly run quotas) apply as described at checkout. You
            may cancel at any time; access continues until the end of the current billing period.
            Fees are non-refundable except where required by law.
          </p>
        </section>
        <section>
          <h2>5. Availability &amp; changes</h2>
          <p>
            The Service is provided on an “as is” and “as available” basis. We may modify, suspend,
            or discontinue features. We will make reasonable efforts to provide notice of material
            changes.
          </p>
        </section>
        <section>
          <h2>6. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, [Company] is not liable for indirect, incidental,
            or consequential damages, or for any loss arising from automations you configure. Our
            total liability is limited to the amounts you paid in the prior twelve months.
          </p>
        </section>
        <section>
          <h2>7. Termination</h2>
          <p>
            We may suspend or terminate access for breach of these Terms. You may stop using the
            Service at any time and delete your workspace.
          </p>
        </section>
        <section>
          <h2>8. Contact</h2>
          <p>Questions about these Terms: [legal@yourcompany.com].</p>
        </section>
      </div>
    </main>
  )
}
