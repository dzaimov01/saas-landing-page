import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Starter', monthly: 0, blurb: 'For individuals automating the basics.',
    features: ['3 active workflows', '500 runs / month', 'Core integrations', 'Community support'],
    cta: 'Start free',
  },
  {
    name: 'Team', monthly: 24, blurb: 'For teams running on automation.', featured: true,
    features: ['Unlimited workflows', '25,000 runs / month', 'All 300+ integrations', 'Conditional logic & approvals', 'Priority support'],
    cta: 'Start 14-day trial',
  },
  {
    name: 'Scale', monthly: 79, blurb: 'For orgs with serious volume.',
    features: ['Everything in Team', '250,000 runs / month', 'SSO & SCIM', 'Audit logs & SOC 2 report', 'Dedicated manager'],
    cta: 'Talk to sales',
  },
]

export default function Pricing() {
  const [annual, setAnnual] = useState(true)

  return (
    <section id="pricing" className="relative border-t border-line py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <p className="label mb-4">Pricing</p>
          <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Simple plans that scale with you
          </h2>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-line bg-surface p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${!annual ? 'bg-fog text-base' : 'text-muted'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${annual ? 'bg-fog text-base' : 'text-muted'}`}
            >
              Annual <span className="text-cyan">−20%</span>
            </button>
          </div>
        </div>

        <div className="grid items-start gap-5 md:grid-cols-3">
          {plans.map((p, i) => {
            const price = annual ? Math.round(p.monthly * 0.8) : p.monthly
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`relative rounded-2xl p-7 ${
                  p.featured
                    ? 'border border-violet/40 bg-surface2 shadow-[0_0_60px_-15px_rgba(124,92,255,0.5)]'
                    : 'glass'
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet to-cyan px-3 py-1 text-xs font-semibold text-base">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-lg font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted">{p.blurb}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-extrabold">£{price}</span>
                  <span className="text-muted">/mo</span>
                </div>
                <a
                  href="#cta"
                  className={`mt-6 block rounded-full py-3 text-center text-sm font-semibold transition-transform hover:scale-[1.02] ${
                    p.featured ? 'bg-gradient-to-r from-violet to-cyan text-base' : 'border border-line text-fog hover:bg-white/5'
                  }`}
                >
                  {p.cta}
                </a>
                <ul className="mt-7 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-fog/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
