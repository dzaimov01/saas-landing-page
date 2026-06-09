import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { ProfileForm } from './ProfileForm'

export default async function ProfileSettings() {
  const user = await requireUser()
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  })
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-display text-2xl font-bold">Profile</h1>
      <ProfileForm name={dbUser?.name ?? ''} email={dbUser?.email ?? ''} />
    </div>
  )
}
