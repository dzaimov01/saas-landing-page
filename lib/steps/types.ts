import type { z } from 'zod'

export type StepKind = 'TRIGGER' | 'ACTION' | 'CONDITION'
export type FieldType = 'text' | 'textarea' | 'select' | 'number'

export interface FieldDescriptor {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  options?: { value: string; label: string }[]
}

export interface StepType {
  key: string
  label: string
  kind: StepKind
  description: string
  configSchema: z.ZodType
  defaultConfig: Record<string, unknown>
  fields: FieldDescriptor[]
  /** Source handle ids (CONDITION → ['true','false']); `target` = accepts an incoming edge. */
  handles: { source: string[]; target: boolean }
}
