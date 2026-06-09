export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="text-sm text-red-400">
      {children}
    </p>
  )
}
