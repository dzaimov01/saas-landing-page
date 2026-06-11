import type { Prisma } from '@prisma/client'
import { db } from '../db'
import { getStepType } from '../steps/registry'
import { getConnector } from '../connectors'
import { getUsableSecret } from '../connections'
import { resolveConfig, type RunContext } from '../template'
import { evaluate, type ConditionConfig } from './condition'
import { nextNodeId } from './plan'

const MAX_STEPS = 100

/**
 * Execute a queued WorkflowRun: traverse the graph from the trigger, run each
 * action connector with templated config, follow condition branches, and record
 * a StepRun per node. Marks the run SUCCEEDED or FAILED.
 */
export async function executeRun(runId: string): Promise<void> {
  const run = await db.workflowRun.findUnique({ where: { id: runId } })
  if (!run) throw new Error(`Run not found: ${runId}`)

  const workflow = await db.workflow.findUnique({
    where: { id: run.workflowId },
    include: { nodes: true, edges: true },
  })
  if (!workflow) throw new Error(`Workflow not found for run ${runId}`)

  await db.workflowRun.update({
    where: { id: runId },
    data: { status: 'RUNNING', startedAt: new Date() },
  })

  const ctx: RunContext = { trigger: run.trigger, steps: {} }
  const trigger = workflow.nodes.find((n) => safeKind(n.type) === 'TRIGGER')

  let currentStepRunId: string | null = null
  try {
    if (!trigger) throw new Error('Workflow has no trigger node')

    let currentId: string | null = trigger.id
    let steps = 0

    while (currentId && steps < MAX_STEPS) {
      steps++
      const node = workflow.nodes.find((n) => n.id === currentId)
      if (!node) break
      const kind = getStepType(node.type).kind
      const config = (node.config ?? {}) as Record<string, unknown>

      const stepRun = await db.stepRun.create({
        data: {
          runId,
          nodeId: node.id,
          type: node.type,
          status: 'RUNNING',
          input: config as Prisma.InputJsonValue,
          startedAt: new Date(),
        },
      })
      currentStepRunId = stepRun.id

      let branch: 'true' | 'false' | undefined
      let output: unknown

      if (kind === 'TRIGGER') {
        output = ctx.trigger
      } else if (kind === 'CONDITION') {
        const result = evaluate(config as unknown as ConditionConfig, ctx)
        branch = result ? 'true' : 'false'
        output = { result }
      } else {
        const stepType = getStepType(node.type)
        const resolved = resolveConfig(config, ctx)
        let secret: Record<string, string> | undefined
        if (stepType.connectionType) {
          const found = await getUsableSecret(String(config.connectionId ?? ''), run.workspaceId)
          if (!found) throw new Error(`No connection selected for "${stepType.label}"`)
          secret = found
        }
        output = await getConnector(node.type)(resolved, ctx, secret)
        ;(ctx.steps as Record<string, unknown>)[node.id] = output
      }

      await db.stepRun.update({
        where: { id: stepRun.id },
        data: {
          status: 'SUCCEEDED',
          output: (output ?? null) as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      })
      currentStepRunId = null

      // A Filter step that does not pass stops the run (successfully).
      if (node.type === 'filter' && (output as { passed?: boolean })?.passed === false) {
        break
      }

      currentId = nextNodeId(node.id, workflow.edges, branch)
    }

    await db.workflowRun.update({
      where: { id: runId },
      data: { status: 'SUCCEEDED', finishedAt: new Date() },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (currentStepRunId) {
      await db.stepRun.update({
        where: { id: currentStepRunId },
        data: { status: 'FAILED', error: message, finishedAt: new Date() },
      })
    }
    await db.workflowRun.update({
      where: { id: runId },
      data: { status: 'FAILED', error: message, finishedAt: new Date() },
    })
  }
}

function safeKind(type: string): string | null {
  try {
    return getStepType(type).kind
  } catch {
    return null
  }
}
