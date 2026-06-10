'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  Zap,
  Globe,
  Mail,
  MessageSquare,
  MessageCircle,
  Send,
  Table,
  FileText,
  Sparkles,
  Braces,
  Filter as FilterIcon,
  Clock,
  GitBranch,
  Webhook,
} from 'lucide-react'
import { getStepType } from '@/lib/steps/registry'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  schedule: Zap,
  webhook: Webhook,
  http_request: Globe,
  send_email: Mail,
  slack_message: MessageSquare,
  discord_message: MessageCircle,
  telegram_message: Send,
  airtable_create: Table,
  notion_create: FileText,
  openai_complete: Sparkles,
  set_data: Braces,
  filter: FilterIcon,
  delay: Clock,
  condition: GitBranch,
}

export type CadenceNodeData = {
  stepType: string
  name: string
  config: Record<string, unknown>
}

export function CadenceNode({ data, selected }: NodeProps) {
  const d = data as CadenceNodeData
  const step = getStepType(d.stepType)
  const Icon = ICONS[d.stepType] ?? Zap
  const accent =
    step.kind === 'TRIGGER' ? 'text-violet' : step.kind === 'CONDITION' ? 'text-amber-400' : 'text-cyan'

  return (
    <div
      className={`w-56 rounded-xl border bg-surface2 px-4 py-3 shadow-lg ${
        selected ? 'border-violet' : 'border-line'
      }`}
    >
      {step.handles.target && (
        <Handle type="target" id="in" position={Position.Top} className="!h-2.5 !w-2.5 !bg-muted" />
      )}

      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {step.label}
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-fog">{d.name || step.label}</p>

      {step.kind === 'CONDITION' ? (
        <>
          <Handle
            type="source"
            id="true"
            position={Position.Bottom}
            style={{ left: '30%' }}
            className="!h-2.5 !w-2.5 !bg-cyan"
          />
          <Handle
            type="source"
            id="false"
            position={Position.Bottom}
            style={{ left: '70%' }}
            className="!h-2.5 !w-2.5 !bg-red-400"
          />
          <div className="mt-2 flex justify-between px-1 text-[10px] text-muted">
            <span>true</span>
            <span>false</span>
          </div>
        </>
      ) : (
        <Handle
          type="source"
          id="out"
          position={Position.Bottom}
          className="!h-2.5 !w-2.5 !bg-muted"
        />
      )}
    </div>
  )
}

export const nodeTypes = { cadence: CadenceNode }
