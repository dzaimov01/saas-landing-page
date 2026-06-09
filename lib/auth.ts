import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { authConfig } from './auth.config'
import { db } from './db'
import { verifyPassword } from './password'
import { createPersonalWorkspace } from './workspace'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds?.email ?? '').toLowerCase()
        const password = String(creds?.password ?? '')
        if (!email || !password) return null
        const user = await db.user.findUnique({ where: { email } })
        if (!user?.passwordHash) return null
        if (!(await verifyPassword(password, user.passwordHash))) return null
        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),
  ],
  events: {
    // Google sign-in creates the User via the adapter; ensure it has a workspace.
    async createUser({ user }) {
      if (user.id) await createPersonalWorkspace({ userId: user.id, name: user.name ?? 'My' })
    },
  },
})
