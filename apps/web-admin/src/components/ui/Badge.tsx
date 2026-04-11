type BadgeVariant = 'blue' | 'green' | 'amber' | 'rose' | 'slate' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  blue:   'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  green:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber:  'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  rose:   'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  slate:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
}

export function Badge({ children, variant = 'slate', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
