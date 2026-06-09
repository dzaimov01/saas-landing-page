'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function CTA() {
  return (
    <section id="cta" className="py-28">
      <div className="mx-auto max-w-5xl px-6">
        <motion.figure
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-20 max-w-3xl text-center"
        >
          <blockquote className="font-display text-2xl font-semibold leading-snug sm:text-3xl">
            “We replaced four brittle Zapier zaps and a weekly spreadsheet ritual with{' '}
            <span className="gradient-text">one Cadence flow</span>. It just runs.”
          </blockquote>
          <figcaption className="mt-6 text-muted">
            Priya Raman · Head of Operations, Lumen
          </figcaption>
        </motion.figure>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-line bg-surface p-10 text-center sm:p-16"
        >
          <div className="mesh pointer-events-none absolute inset-0" />
          <div className="relative">
            <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Stop doing it by hand.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted">
              Build your first automation in five minutes. Free for 14 days, no card required.
            </p>
            <a
              href="/signup"
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-8 py-4 text-sm font-semibold text-ink transition-transform hover:scale-[1.03]"
            >
              Get started free{' '}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
