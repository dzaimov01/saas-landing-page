import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

// `eslint-config-next/core-web-vitals` already bundles the jsx-a11y plugin and
// its recommended accessibility rules, so we extend it directly.
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...(Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : [nextCoreWebVitals]),
]

export default config
