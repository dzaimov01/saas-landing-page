// Provide safe defaults so modules that validate env (lib/env) import cleanly.
// Integration tests that need a real database use the DATABASE_URL below (:5433).
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5433/cadence?schema=public'
process.env.AUTH_SECRET ??= 'test-secret-test-secret-test-secret'
process.env.APP_URL ??= 'http://localhost:3000'

import '@testing-library/jest-dom/vitest'
