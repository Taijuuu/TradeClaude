import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  positive?: boolean | null
  children?: React.ReactNode
}

export function StatCard({ label, value, sub, positive, children }: StatCardProps) {
  const valueColor =
    positive === true ? 'text-green-400' :
    positive === false ? 'text-red-400' :
    'text-[var(--text-primary)]'

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={cn('text-xl font-bold', valueColor)}>{value}</span>
      {sub && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
      {children}
    </div>
  )
}
