import { clsx } from 'clsx'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      className={clsx(
        'rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100',
        variant === 'primary'
          ? 'bg-gradient-to-r from-violet to-cyan text-ink'
          : 'border border-line text-fog hover:bg-white/5',
        className,
      )}
      {...props}
    />
  )
}
