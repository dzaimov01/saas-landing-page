'use client'

import { motion } from 'framer-motion'
import { Workflow, Plug, ShieldCheck, GitBranch, Clock } from 'lucide-react'
import Counter from './Counter'

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
}

export default function Features() {
  return (
    <section id="features" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 max-w-2xl">
          <p className="label mb-4">Why Cadence</p>
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            One canvas for every
            <br />
            workflow you repeat.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Big card with stat */}
          <motion.div
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="glass relative overflow-hidden rounded-2xl p-7 md:col-span-2 md:row-span-2"
          >
            <div className="mesh pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative">
              <Workflow className="h-7 w-7 text-violet" strokeWidth={1.75} />
              <h3 className="mt-5 font-display text-2xl font-bold">Visual automation builder</h3>
              <p className="mt-2 max-w-md text-muted">
                Drag triggers and actions onto a canvas. Branch on conditions, add
                approvals, and watch runs execute in real time — no code.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6">
                <Stat value={<Counter to={12} suffix="h" />} label="hours saved / week*" />
                <Stat value={<Counter to={99.9} decimals={1} suffix="%" />} label="uptime target" />
                <Stat value={<Counter to={6} suffix="+" />} label="connectors &amp; APIs" />
              </div>
              <p className="mt-3 text-[11px] text-muted">*Illustrative; varies by team and workflows.</p>
            </div>
          </motion.div>

          <Card
            icon={Plug}
            title="Connect your stack"
            desc="HTTP requests, email, and Slack today — a growing connector library."
          />
          <Card
            icon={ShieldCheck}
            title="Secure by design"
            desc="Encrypted connections, workspace roles, and full run history."
          />
          <Card
            icon={GitBranch}
            title="Conditional logic"
            desc="Branch, loop and wait on real-world events."
          />
          <Card
            icon={Clock}
            title="Scheduled runs"
            desc="Cron-style triggers down to the minute, any timezone."
          />
        </div>
      </div>
    </section>
  )
}

function Card({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  desc: string
}) {
  return (
    <motion.div
      variants={fade}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      className="glass rounded-2xl p-7 transition-colors hover:border-white/15"
    >
      <Icon className="h-6 w-6 text-cyan" strokeWidth={1.75} />
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted">{desc}</p>
    </motion.div>
  )
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold gradient-text">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  )
}
