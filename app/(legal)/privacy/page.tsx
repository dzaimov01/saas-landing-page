import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — Cadence' }

export default function PrivacyPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-20">
      <Link href="/" className="text-sm text-muted hover:text-fog">
        ← Back to Cadence
      </Link>
      <h1 className="mt-4 font-display text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: 9 June 2026</p>

      <div className="mt-8 space-y-6 text-fog/90 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-fog [&_li]:text-muted [&_p]:mt-2 [&_p]:text-muted">
        <section>
          <h2>1. Who we are</h2>
          <p>
            Cadence is operated by [Company], [Address]. This policy explains what personal data we
            process and why. For privacy questions, contact [privacy@yourcompany.com].
          </p>
        </section>
        <section>
          <h2>2. Data we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Account data: name, email, hashed password, workspace membership.</li>
            <li>Workflow data: the workflows, connections, and run history you create.</li>
            <li>Billing data: subscription status and customer identifiers (card data is handled
              solely by our payment processor, Stripe).</li>
            <li>Technical data: logs and error reports used to operate and secure the Service.</li>
          </ul>
        </section>
        <section>
          <h2>3. How we use data</h2>
          <p>
            To provide and secure the Service, execute the automations you configure, process
            payments, communicate with you, and comply with legal obligations. We do not sell your
            personal data.
          </p>
        </section>
        <section>
          <h2>4. Processors</h2>
          <p>
            We share data with infrastructure and service providers acting on our behalf, including
            our database and hosting providers, Stripe (payments), and an email provider for
            transactional messages. Each processes data under contract.
          </p>
        </section>
        <section>
          <h2>5. Retention</h2>
          <p>
            We retain account and workflow data while your account is active. You may delete your
            workspace, after which we remove associated data within a reasonable period, subject to
            legal retention requirements.
          </p>
        </section>
        <section>
          <h2>6. Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, export, or delete
            your personal data, and to object to or restrict certain processing. Contact us to
            exercise these rights.
          </p>
        </section>
        <section>
          <h2>7. Changes</h2>
          <p>We may update this policy and will revise the “last updated” date above.</p>
        </section>
      </div>
    </main>
  )
}
