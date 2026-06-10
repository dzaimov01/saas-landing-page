import type { Connector } from './types'

/** Parses a JSON object so its keys are available via {{steps.<id>.<key>}}. */
export const setData: Connector = async (config) => {
  if (typeof config.json === 'string' && config.json.trim()) {
    try {
      return JSON.parse(config.json)
    } catch {
      throw new Error('Set data: value is not valid JSON')
    }
  }
  return {}
}
