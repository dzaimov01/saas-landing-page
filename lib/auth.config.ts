import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

/**
 * Edge-safe Auth.js configuration: no database adapter, no Node-only providers.
 * Used by `middleware.ts` (Edge runtime) and spread into the full config in
 * `lib/auth.ts` (Node runtime).
 */
export const authConfig = {
  // Required for self-hosted / non-Vercel production (e.g. `next start`, Docker).
  trustHost: true,
  pages: { signIn: '/login' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = user.id
      return token
    },
    session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string
      return session
    },
  },
} satisfies NextAuthConfig
