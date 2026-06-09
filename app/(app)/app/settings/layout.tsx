import { SettingsNav } from '@/components/app/SettingsNav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SettingsNav />
      {children}
    </div>
  )
}
