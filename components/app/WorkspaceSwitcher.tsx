'use client'

type Item = { workspaceId: string; workspace: { id: string; name: string } }

export function WorkspaceSwitcher({ items, current }: { items: Item[]; current: string }) {
  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await fetch('/api/workspace/switch', {
      method: 'POST',
      body: JSON.stringify({ workspaceId: e.target.value }),
    })
    window.location.reload()
  }

  return (
    <select
      aria-label="Switch workspace"
      value={current}
      onChange={onChange}
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fog"
    >
      {items.map((m) => (
        <option key={m.workspaceId} value={m.workspaceId}>
          {m.workspace.name}
        </option>
      ))}
    </select>
  )
}
