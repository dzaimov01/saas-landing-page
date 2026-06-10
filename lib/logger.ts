type Level = 'info' | 'warn' | 'error'

const isProd = process.env.NODE_ENV === 'production'

export function formatEntry(level: Level, message: string, meta?: Record<string, unknown>): string {
  if (isProd) {
    return JSON.stringify({ level, message, ...meta, time: new Date().toISOString() })
  }
  return `[${level}] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`
}

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  const line = formatEntry(level, message, meta)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
}
