import { spawn, type ChildProcess } from 'node:child_process'

/**
 * Starts the BullMQ worker so end-to-end runs actually execute.
 * Requires Redis (REDIS_URL) and Postgres (DATABASE_URL) to be reachable —
 * the worker loads them from .env via `npm run worker`.
 * Returns a teardown function that stops the worker after the test run.
 */
export default async function globalSetup() {
  const worker: ChildProcess = spawn('npm', ['run', 'worker'], {
    stdio: 'inherit',
    env: process.env,
  })
  // Give the worker a moment to connect to Redis.
  await new Promise((resolve) => setTimeout(resolve, 3000))

  return async () => {
    worker.kill('SIGTERM')
  }
}
