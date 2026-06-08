import { motion } from 'framer-motion'
import { ArrowRight, Zap, Check } from 'lucide-react'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }
const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
}

export default function Hero() {
  return (
    <section id="top" className="relative pt-40 pb-24">
      <div className="mesh pointer-events-none absolute inset-0" />
      <div className="grid-overlay pointer-events-none absolute inset-0 h-[600px]" />

      <motion.div variants={container} initial="hidden" animate="show" className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.a
          variants={rise}
          href="#features"
          className="glass mx-auto mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted"
        >
          <Zap className="h-3.5 w-3.5 text-cyan" /> New — AI-suggested automations
          <ArrowRight className="h-3.5 w-3.5" />
        </motion.a>

        <motion.h1
          variants={rise}
          className="font-display text-[clamp(2.75rem,7vw,5.25rem)] font-extrabold leading-[1.02] tracking-[-0.03em]"
        >
          Automate the busywork.
          <br />
          <span className="gradient-text">Keep the momentum.</span>
        </motion.h1>

        <motion.p variants={rise} className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-muted">
          Cadence connects your tools and runs the repetitive workflows your team
          does by hand — approvals, handoffs, reminders, reports. Set the rules
          once; it runs forever.
        </motion.p>

        <motion.div variants={rise} className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <a href="#pricing" className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-7 py-3.5 text-sm font-semibold text-base transition-transform hover:scale-[1.03]">
            Start free for 14 days <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a href="#features" className="rounded-full border border-line px-7 py-3.5 text-sm font-semibold text-fog transition-colors hover:bg-white/5">
            See how it works
          </a>
        </motion.div>

        <motion.div variants={rise} className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-cyan" /> No credit card</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-cyan" /> 5-minute setup</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-cyan" /> Cancel anytime</span>
        </motion.div>
      </motion.div>

      {/* Product mockup */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto mt-16 max-w-4xl px-6"
      >
        <div className="glass overflow-hidden rounded-2xl p-2 shadow-2xl">
          <div className="rounded-xl bg-surface p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-white/15" />
              <span className="h-3 w-3 rounded-full bg-white/15" />
              <span className="h-3 w-3 rounded-full bg-white/15" />
              <span className="ml-3 text-xs text-muted">cadence · invoice-approval-flow</span>
            </div>
            <div className="space-y-3">
              {[
                { t: 'Trigger', d: 'New invoice over £5,000', c: 'violet' },
                { t: 'Action', d: 'Request approval from finance lead', c: 'cyan' },
                { t: 'Action', d: 'Post to #finance and log to sheet', c: 'violet' },
                { t: 'Done', d: 'Notify requester · 0 manual steps', c: 'cyan' },
              ].map((s, i) => (
                <motion.div
                  key={s.t}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.18 }}
                  className="flex items-center gap-4 rounded-lg border border-line bg-surface2 px-4 py-3"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.c === 'violet' ? 'bg-violet' : 'bg-cyan'}`} />
                  <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-muted">{s.t}</span>
                  <span className="text-sm text-fog">{s.d}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
