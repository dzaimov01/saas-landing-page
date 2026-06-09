import { clsx } from 'clsx'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fog outline-none transition-colors focus-visible:border-violet disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
