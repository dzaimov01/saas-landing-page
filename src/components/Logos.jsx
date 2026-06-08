export default function Logos() {
  const names = ['Northwind', 'Lumen', 'Forge', 'Atlas', 'Quanta', 'Vertex']
  return (
    <section className="border-y border-line py-12">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-7 text-center text-xs uppercase tracking-[0.3em] text-muted">
          Trusted by fast-moving teams
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
          {names.map((n) => (
            <span key={n} className="font-display text-xl font-bold text-fog/35 transition-colors hover:text-fog/70">
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
