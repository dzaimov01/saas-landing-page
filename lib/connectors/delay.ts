import type { Connector } from './types'

const MAX_DELAY_SECONDS = 900

export const delay: Connector = async (config) => {
  const seconds = Math.min(Math.max(Number(config.seconds) || 0, 0), MAX_DELAY_SECONDS)
  const ms = seconds * 1000
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
  return { waitedSeconds: seconds }
}
