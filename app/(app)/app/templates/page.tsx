import { TEMPLATES } from '@/lib/templates'
import { TemplatesClient } from './TemplatesClient'

export default function TemplatesPage() {
  return (
    <TemplatesClient
      templates={TEMPLATES.map((t) => ({
        key: t.key,
        name: t.name,
        description: t.description,
        category: t.category,
        steps: t.nodes.length,
      }))}
    />
  )
}
