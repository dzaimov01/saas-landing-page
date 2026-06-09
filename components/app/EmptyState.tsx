export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line p-12 text-center">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>
    </div>
  )
}
