import Link from 'next/link'
import { Workflow, PlayCircle, Plug, LayoutTemplate, Settings } from 'lucide-react'

const items = [
  { href: '/app', label: 'Workflows', icon: Workflow },
  { href: '/app/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/app/runs', label: 'Runs', icon: PlayCircle },
  { href: '/app/connections', label: 'Connections', icon: Plug },
  { href: '/app/settings/profile', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line p-4 md:block">
      <nav className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fog"
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
